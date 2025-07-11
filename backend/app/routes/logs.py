import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import request, current_app, send_file
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models import User, LogFile, LogEntry, Anomaly
from app.services.parser import LogParserService
from app.services.anomaly import AnomalyDetectionService

# Create namespace for log operations
logs_ns = Namespace('logs', description='Log file operations')

# Define models for request/response validation
upload_response_model = logs_ns.model('UploadResponse', {
    'log_id': fields.String(description='Uploaded log file ID'),
    'filename': fields.String(description='Original filename'),
    'status': fields.String(description='Processing status'),
    'message': fields.String(description='Status message')
})

log_file_model = logs_ns.model('LogFile', {
    'id': fields.String(description='Log file ID'),
    'filename': fields.String(description='Original filename'),
    'file_size': fields.Integer(description='File size in bytes'),
    'status': fields.String(description='Processing status'),
    'processing_progress': fields.Integer(description='Processing progress (0-100)'),
    'log_format': fields.String(description='Detected log format'),
    'total_entries': fields.Integer(description='Total number of log entries'),
    'date_range_start': fields.String(description='Earliest log entry timestamp'),
    'date_range_end': fields.String(description='Latest log entry timestamp'),
    'created_at': fields.String(description='Upload timestamp'),
    'processed_at': fields.String(description='Processing completion timestamp'),
    'summary': fields.Raw(description='Log analysis summary')
})

log_entry_model = logs_ns.model('LogEntry', {
    'id': fields.Integer(description='Entry ID'),
    'timestamp': fields.String(description='Log entry timestamp'),
    'src_ip': fields.String(description='Source IP address'),
    'dest_host': fields.String(description='Destination host'),
    'method': fields.String(description='HTTP method'),
    'url': fields.String(description='Request URL'),
    'status_code': fields.Integer(description='HTTP status code'),
    'response_size': fields.Integer(description='Response size in bytes'),
    'user_agent': fields.String(description='User agent string'),
    'raw_log': fields.String(description='Original log line'),
    'anomalies': fields.List(fields.Raw, description='Associated anomalies')
})

pagination_model = logs_ns.model('Pagination', {
    'page': fields.Integer(description='Current page number'),
    'per_page': fields.Integer(description='Items per page'),
    'total': fields.Integer(description='Total number of items'),
    'pages': fields.Integer(description='Total number of pages')
})

log_entries_response_model = logs_ns.model('LogEntriesResponse', {
    'entries': fields.List(fields.Nested(log_entry_model)),
    'pagination': fields.Nested(pagination_model),
    'log_file': fields.Nested(log_file_model)
})


def allowed_file(filename):
    """Check if uploaded file has allowed extension"""
    allowed_extensions = {'log', 'txt', 'csv', 'tsv'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


@logs_ns.route('/upload')
class LogUploadResource(Resource):
    @jwt_required()
    @logs_ns.marshal_with(upload_response_model)
    @logs_ns.doc(responses={
        200: 'File uploaded successfully',
        400: 'Invalid file or request',
        401: 'Authentication required',
        413: 'File too large'
    })
    def post(self):
        """Upload a log file for analysis"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                logs_ns.abort(401, 'Invalid user')
            
            # Check if file is present in request
            if 'file' not in request.files:
                logs_ns.abort(400, 'No file provided')
            
            file = request.files['file']
            
            if file.filename == '':
                logs_ns.abort(400, 'No file selected')
            
            if not allowed_file(file.filename):
                logs_ns.abort(400, 'File type not supported. Allowed: .log, .txt, .csv, .tsv')
            
            # Generate unique filename
            log_id = str(uuid.uuid4())
            original_filename = secure_filename(file.filename)
            filename = f"{log_id}_{original_filename}"
            
            # Save file to upload directory
            upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(upload_path)
            
            # Get file size
            file_size = os.path.getsize(upload_path)
            
            # Create log file record
            log_file = LogFile(
                id=log_id,
                user_id=user.id,
                filename=filename,
                original_filename=original_filename,
                file_path=upload_path,
                file_size=file_size,
                content_type=file.content_type,
                status='uploaded'
            )
            
            db.session.add(log_file)
            db.session.commit()
            
            current_app.logger.info(f'File uploaded: {original_filename} by user {user.email}')
            
            # Start background processing
            try:
                log_parser = LogParserService()
                log_parser.process_log_file_async(log_id)
            except Exception as e:
                current_app.logger.error(f'Failed to start log processing: {str(e)}')
                log_file.status = 'error'
                log_file.error_message = 'Failed to start processing'
                db.session.commit()
            
            return {
                'log_id': log_id,
                'filename': original_filename,
                'status': log_file.status,
                'message': 'File uploaded successfully and processing started'
            }
            
        except Exception as e:
            current_app.logger.error(f'Upload error: {str(e)}')
            logs_ns.abort(500, 'Internal server error')


@logs_ns.route('/')
class LogListResource(Resource):
    @jwt_required()
    @logs_ns.marshal_list_with(log_file_model)
    @logs_ns.doc(responses={
        200: 'Success',
        401: 'Authentication required'
    })
    def get(self):
        """Get list of uploaded log files for current user"""
        try:
            user_id = get_jwt_identity()
            
            # Get query parameters
            page = request.args.get('page', 1, type=int)
            per_page = min(request.args.get('per_page', 10, type=int), 100)
            status = request.args.get('status', None)
            
            # Build query
            query = LogFile.query.filter_by(user_id=user_id)
            
            if status:
                query = query.filter_by(status=status)
            
            # Order by creation date (newest first)
            query = query.order_by(LogFile.created_at.desc())
            
            # Paginate results
            paginated = query.paginate(
                page=page, 
                per_page=per_page, 
                error_out=False
            )
            
            return [log_file.to_dict() for log_file in paginated.items]
            
        except Exception as e:
            current_app.logger.error(f'Log list error: {str(e)}')
            logs_ns.abort(500, 'Internal server error')


@logs_ns.route('/<string:log_id>')
class LogDetailResource(Resource):
    @jwt_required()
    @logs_ns.marshal_with(log_file_model)
    @logs_ns.doc(responses={
        200: 'Success',
        401: 'Authentication required',
        404: 'Log file not found'
    })
    def get(self, log_id):
        """Get log file details and metadata"""
        try:
            user_id = get_jwt_identity()
            
            log_file = LogFile.query.filter_by(id=log_id, user_id=user_id).first()
            
            if not log_file:
                logs_ns.abort(404, 'Log file not found')
            
            return log_file.to_dict()
            
        except Exception as e:
            current_app.logger.error(f'Log detail error: {str(e)}')
            logs_ns.abort(500, 'Internal server error')
    
    @jwt_required()
    @logs_ns.doc(responses={
        204: 'Log file deleted',
        401: 'Authentication required',
        404: 'Log file not found'
    })
    def delete(self, log_id):
        """Delete a log file and all associated data"""
        try:
            user_id = get_jwt_identity()
            
            log_file = LogFile.query.filter_by(id=log_id, user_id=user_id).first()
            
            if not log_file:
                logs_ns.abort(404, 'Log file not found')
            
            # Delete physical file
            try:
                if os.path.exists(log_file.file_path):
                    os.remove(log_file.file_path)
            except Exception as e:
                current_app.logger.warning(f'Failed to delete physical file: {str(e)}')
            
            # Delete database records (cascades to entries and anomalies)
            db.session.delete(log_file)
            db.session.commit()
            
            current_app.logger.info(f'Log file deleted: {log_id}')
            
            return '', 204
            
        except Exception as e:
            current_app.logger.error(f'Log delete error: {str(e)}')
            logs_ns.abort(500, 'Internal server error')


@logs_ns.route('/<string:log_id>/entries')
class LogEntriesResource(Resource):
    @jwt_required()
    @logs_ns.marshal_with(log_entries_response_model)
    @logs_ns.doc(responses={
        200: 'Success',
        401: 'Authentication required',
        404: 'Log file not found'
    })
    def get(self, log_id):
        """Get paginated log entries for a specific log file"""
        try:
            user_id = get_jwt_identity()
            
            log_file = LogFile.query.filter_by(id=log_id, user_id=user_id).first()
            
            if not log_file:
                logs_ns.abort(404, 'Log file not found')
            
            # Get query parameters
            page = request.args.get('page', 1, type=int)
            per_page = min(request.args.get('per_page', 50, type=int), 200)
            search = request.args.get('search', '').strip()
            filter_anomalies = request.args.get('anomalies_only', 'false').lower() == 'true'
            
            # Build query
            query = LogEntry.query.filter_by(log_id=log_id)
            
            # Apply search filter
            if search:
                query = query.filter(
                    db.or_(
                        LogEntry.raw_log.ilike(f'%{search}%'),
                        LogEntry.src_ip.cast(db.String).ilike(f'%{search}%'),
                        LogEntry.dest_host.ilike(f'%{search}%'),
                        LogEntry.url.ilike(f'%{search}%')
                    )
                )
            
            # Filter for anomalies only
            if filter_anomalies:
                query = query.join(Anomaly).distinct()
            
            # Order by timestamp
            query = query.order_by(LogEntry.timestamp.desc())
            
            # Paginate results
            paginated = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )
            
            return {
                'entries': [entry.to_dict() for entry in paginated.items],
                'pagination': {
                    'page': paginated.page,
                    'per_page': paginated.per_page,
                    'total': paginated.total,
                    'pages': paginated.pages
                },
                'log_file': log_file.to_dict(include_summary=False)
            }
            
        except Exception as e:
            current_app.logger.error(f'Log entries error: {str(e)}')
            logs_ns.abort(500, 'Internal server error')


@logs_ns.route('/<string:log_id>/download')
class LogDownloadResource(Resource):
    @jwt_required()
    @logs_ns.doc(responses={
        200: 'File download',
        401: 'Authentication required',
        404: 'Log file not found'
    })
    def get(self, log_id):
        """Download the original log file"""
        try:
            user_id = get_jwt_identity()
            
            log_file = LogFile.query.filter_by(id=log_id, user_id=user_id).first()
            
            if not log_file:
                logs_ns.abort(404, 'Log file not found')
            
            if not os.path.exists(log_file.file_path):
                logs_ns.abort(404, 'Physical file not found')
            
            return send_file(
                log_file.file_path,
                as_attachment=True,
                download_name=log_file.original_filename,
                mimetype=log_file.content_type or 'text/plain'
            )
            
        except Exception as e:
            current_app.logger.error(f'Log download error: {str(e)}')
            logs_ns.abort(500, 'Internal server error') 