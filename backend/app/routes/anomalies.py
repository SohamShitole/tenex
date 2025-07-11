from flask import request, current_app
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc

from app import db
from app.models import User, LogFile, Anomaly, LogEntry

# Create namespace for anomaly operations
anomalies_ns = Namespace('anomalies', description='Anomaly detection operations')

# Define models for request/response validation
anomaly_model = anomalies_ns.model('Anomaly', {
    'id': fields.Integer(description='Anomaly ID'),
    'entry_id': fields.Integer(description='Associated log entry ID'),
    'anomaly_type': fields.String(description='Type of anomaly'),
    'reason': fields.String(description='Human-readable explanation'),
    'confidence': fields.Float(description='Confidence score (0.0-1.0)'),
    'severity': fields.String(description='Severity level'),
    'model_used': fields.String(description='ML model used for detection'),
    'feature_contributions': fields.Raw(description='Feature importance data'),
    'context_window_start': fields.String(description='Context window start time'),
    'context_window_end': fields.String(description='Context window end time'),
    'related_entries_count': fields.Integer(description='Number of related entries'),
    'detected_at': fields.String(description='Detection timestamp')
})

anomaly_with_entry_model = anomalies_ns.model('AnomalyWithEntry', {
    'anomaly': fields.Nested(anomaly_model),
    'log_entry': fields.Raw(description='Associated log entry')
})

anomaly_stats_model = anomalies_ns.model('AnomalyStats', {
    'total_anomalies': fields.Integer(description='Total number of anomalies'),
    'by_type': fields.Raw(description='Anomalies grouped by type'),
    'by_severity': fields.Raw(description='Anomalies grouped by severity'),
    'timeline': fields.List(fields.Raw, description='Anomaly timeline data'),
    'top_ips': fields.List(fields.Raw, description='Top source IPs with anomalies'),
    'confidence_distribution': fields.Raw(description='Distribution of confidence scores')
})

pagination_model = anomalies_ns.model('Pagination', {
    'page': fields.Integer(description='Current page number'),
    'per_page': fields.Integer(description='Items per page'),
    'total': fields.Integer(description='Total number of items'),
    'pages': fields.Integer(description='Total number of pages')
})

anomalies_response_model = anomalies_ns.model('AnomaliesResponse', {
    'anomalies': fields.List(fields.Nested(anomaly_with_entry_model)),
    'pagination': fields.Nested(pagination_model),
    'stats': fields.Nested(anomaly_stats_model)
})


@anomalies_ns.route('/<string:log_id>')
class LogAnomaliesResource(Resource):
    @jwt_required()
    @anomalies_ns.marshal_with(anomalies_response_model)
    @anomalies_ns.doc(responses={
        200: 'Success',
        401: 'Authentication required',
        404: 'Log file not found'
    })
    def get(self, log_id):
        """Get anomalies for a specific log file with statistics"""
        try:
            user_id = get_jwt_identity()
            
            # Verify log file ownership
            log_file = LogFile.query.filter_by(id=log_id, user_id=user_id).first()
            if not log_file:
                anomalies_ns.abort(404, 'Log file not found')
            
            # Get query parameters
            page = request.args.get('page', 1, type=int)
            per_page = min(request.args.get('per_page', 20, type=int), 100)
            severity = request.args.get('severity', None)
            anomaly_type = request.args.get('type', None)
            min_confidence = request.args.get('min_confidence', type=float)
            
            # Build query for anomalies
            query = Anomaly.query.filter_by(log_id=log_id)
            
            # Apply filters
            if severity:
                query = query.filter_by(severity=severity)
            
            if anomaly_type:
                query = query.filter_by(anomaly_type=anomaly_type)
            
            if min_confidence is not None:
                query = query.filter(Anomaly.confidence >= min_confidence)
            
            # Order by confidence (highest first) and detection time
            query = query.order_by(desc(Anomaly.confidence), desc(Anomaly.detected_at))
            
            # Paginate results
            paginated = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )
            
            # Get associated log entries
            anomalies_with_entries = []
            for anomaly in paginated.items:
                log_entry = LogEntry.query.get(anomaly.entry_id)
                anomalies_with_entries.append({
                    'anomaly': anomaly.to_dict(),
                    'log_entry': log_entry.to_dict() if log_entry else None
                })
            
            # Calculate statistics
            stats = self._calculate_anomaly_stats(log_id)
            
            return {
                'anomalies': anomalies_with_entries,
                'pagination': {
                    'page': paginated.page,
                    'per_page': paginated.per_page,
                    'total': paginated.total,
                    'pages': paginated.pages
                },
                'stats': stats
            }
            
        except Exception as e:
            current_app.logger.error(f'Anomalies fetch error: {str(e)}')
            anomalies_ns.abort(500, 'Internal server error')
    
    def _calculate_anomaly_stats(self, log_id):
        """Calculate anomaly statistics for a log file"""
        try:
            # Total anomalies
            total_anomalies = Anomaly.query.filter_by(log_id=log_id).count()
            
            # Group by type
            type_stats = db.session.query(
                Anomaly.anomaly_type,
                db.func.count(Anomaly.id).label('count')
            ).filter_by(log_id=log_id).group_by(Anomaly.anomaly_type).all()
            
            by_type = {stat.anomaly_type: stat.count for stat in type_stats}
            
            # Group by severity
            severity_stats = db.session.query(
                Anomaly.severity,
                db.func.count(Anomaly.id).label('count')
            ).filter_by(log_id=log_id).group_by(Anomaly.severity).all()
            
            by_severity = {stat.severity: stat.count for stat in severity_stats}
            
            # Timeline data (anomalies per hour)
            timeline_stats = db.session.query(
                db.func.date_trunc('hour', Anomaly.detected_at).label('hour'),
                db.func.count(Anomaly.id).label('count')
            ).filter_by(log_id=log_id).group_by('hour').order_by('hour').all()
            
            timeline = [
                {
                    'timestamp': stat.hour.isoformat(),
                    'count': stat.count
                }
                for stat in timeline_stats
            ]
            
            # Top source IPs with anomalies
            top_ips_stats = db.session.query(
                LogEntry.src_ip,
                db.func.count(Anomaly.id).label('anomaly_count')
            ).join(Anomaly, LogEntry.id == Anomaly.entry_id)\
             .filter(Anomaly.log_id == log_id)\
             .group_by(LogEntry.src_ip)\
             .order_by(desc('anomaly_count'))\
             .limit(10).all()
            
            top_ips = [
                {
                    'ip': str(stat.src_ip) if stat.src_ip else 'Unknown',
                    'anomaly_count': stat.anomaly_count
                }
                for stat in top_ips_stats
            ]
            
            # Confidence score distribution
            confidence_ranges = [
                (0.0, 0.2, 'Very Low'),
                (0.2, 0.4, 'Low'),
                (0.4, 0.6, 'Medium'),
                (0.6, 0.8, 'High'),
                (0.8, 1.0, 'Very High')
            ]
            
            confidence_distribution = {}
            for min_conf, max_conf, label in confidence_ranges:
                count = Anomaly.query.filter_by(log_id=log_id)\
                    .filter(Anomaly.confidence >= min_conf)\
                    .filter(Anomaly.confidence < max_conf if max_conf < 1.0 else Anomaly.confidence <= max_conf)\
                    .count()
                confidence_distribution[label] = count
            
            return {
                'total_anomalies': total_anomalies,
                'by_type': by_type,
                'by_severity': by_severity,
                'timeline': timeline,
                'top_ips': top_ips,
                'confidence_distribution': confidence_distribution
            }
            
        except Exception as e:
            current_app.logger.error(f'Stats calculation error: {str(e)}')
            return {
                'total_anomalies': 0,
                'by_type': {},
                'by_severity': {},
                'timeline': [],
                'top_ips': [],
                'confidence_distribution': {}
            }


@anomalies_ns.route('/<string:log_id>/summary')
class AnomalySummaryResource(Resource):
    @jwt_required()
    @anomalies_ns.marshal_with(anomaly_stats_model)
    @anomalies_ns.doc(responses={
        200: 'Success',
        401: 'Authentication required',
        404: 'Log file not found'
    })
    def get(self, log_id):
        """Get anomaly summary and statistics for a log file"""
        try:
            user_id = get_jwt_identity()
            
            # Verify log file ownership
            log_file = LogFile.query.filter_by(id=log_id, user_id=user_id).first()
            if not log_file:
                anomalies_ns.abort(404, 'Log file not found')
            
            # Calculate and return statistics
            stats = LogAnomaliesResource()._calculate_anomaly_stats(log_id)
            return stats
            
        except Exception as e:
            current_app.logger.error(f'Anomaly summary error: {str(e)}')
            anomalies_ns.abort(500, 'Internal server error')


@anomalies_ns.route('/detail/<int:anomaly_id>')
class AnomalyDetailResource(Resource):
    @jwt_required()
    @anomalies_ns.marshal_with(anomaly_with_entry_model)
    @anomalies_ns.doc(responses={
        200: 'Success',
        401: 'Authentication required',
        404: 'Anomaly not found'
    })
    def get(self, anomaly_id):
        """Get detailed information about a specific anomaly"""
        try:
            user_id = get_jwt_identity()
            
            # Get anomaly and verify ownership through log file
            anomaly = Anomaly.query.join(LogFile)\
                .filter(Anomaly.id == anomaly_id)\
                .filter(LogFile.user_id == user_id)\
                .first()
            
            if not anomaly:
                anomalies_ns.abort(404, 'Anomaly not found')
            
            # Get associated log entry
            log_entry = LogEntry.query.get(anomaly.entry_id)
            
            return {
                'anomaly': anomaly.to_dict(),
                'log_entry': log_entry.to_dict() if log_entry else None
            }
            
        except Exception as e:
            current_app.logger.error(f'Anomaly detail error: {str(e)}')
            anomalies_ns.abort(500, 'Internal server error')


@anomalies_ns.route('/types')
class AnomalyTypesResource(Resource):
    @jwt_required()
    @anomalies_ns.doc(responses={
        200: 'Success',
        401: 'Authentication required'
    })
    def get(self):
        """Get available anomaly types and severities for filtering"""
        try:
            user_id = get_jwt_identity()
            
            # Get unique anomaly types for user's logs
            types = db.session.query(Anomaly.anomaly_type.distinct())\
                .join(LogFile)\
                .filter(LogFile.user_id == user_id)\
                .all()
            
            # Get unique severities
            severities = db.session.query(Anomaly.severity.distinct())\
                .join(LogFile)\
                .filter(LogFile.user_id == user_id)\
                .all()
            
            return {
                'types': [t[0] for t in types],
                'severities': [s[0] for s in severities]
            }
            
        except Exception as e:
            current_app.logger.error(f'Anomaly types error: {str(e)}')
            anomalies_ns.abort(500, 'Internal server error') 