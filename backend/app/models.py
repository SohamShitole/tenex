import uuid
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy import text
from flask_sqlalchemy import SQLAlchemy
import bcrypt

from app import db


class User(db.Model):
    """User model for authentication"""
    __tablename__ = 'users'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    log_files = db.relationship('LogFile', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set the password"""
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password):
        """Check if password is correct"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': str(self.id),
            'email': self.email,
            'username': self.username,
            'created_at': self.created_at.isoformat(),
            'is_active': self.is_active
        }


class LogFile(db.Model):
    """Log file model for uploaded files"""
    __tablename__ = 'log_files'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.BigInteger, nullable=False)
    content_type = db.Column(db.String(100))
    
    # Processing status
    status = db.Column(db.String(50), default='uploaded')  # uploaded, processing, ready, error
    processing_progress = db.Column(db.Integer, default=0)  # 0-100
    error_message = db.Column(db.Text)
    
    # Log analysis results
    log_format = db.Column(db.String(100))  # zscaler, nginx, apache, etc.
    total_entries = db.Column(db.Integer, default=0)
    date_range_start = db.Column(db.DateTime)
    date_range_end = db.Column(db.DateTime)
    summary = db.Column(JSONB)  # JSON summary of analysis
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime)
    
    # Relationships
    log_entries = db.relationship('LogEntry', backref='log_file', lazy=True, cascade='all, delete-orphan')
    anomalies = db.relationship('Anomaly', backref='log_file', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self, include_summary=True):
        """Convert log file to dictionary"""
        result = {
            'id': str(self.id),
            'filename': self.original_filename,
            'file_size': self.file_size,
            'content_type': self.content_type,
            'status': self.status,
            'processing_progress': self.processing_progress,
            'log_format': self.log_format,
            'total_entries': self.total_entries,
            'date_range_start': self.date_range_start.isoformat() if self.date_range_start else None,
            'date_range_end': self.date_range_end.isoformat() if self.date_range_end else None,
            'created_at': self.created_at.isoformat(),
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'error_message': self.error_message
        }
        
        if include_summary and self.summary:
            result['summary'] = self.summary
            
        return result


class LogEntry(db.Model):
    """Individual log entry model"""
    __tablename__ = 'log_entries'
    
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    log_id = db.Column(UUID(as_uuid=True), db.ForeignKey('log_files.id'), nullable=False, index=True)
    
    # Common fields across log formats
    timestamp = db.Column(db.DateTime, nullable=False, index=True)
    src_ip = db.Column(INET, index=True)
    dest_host = db.Column(db.String(255), index=True)
    method = db.Column(db.String(10), index=True)
    url = db.Column(db.Text)
    status_code = db.Column(db.SmallInteger, index=True)
    response_size = db.Column(db.BigInteger)
    user_agent = db.Column(db.Text)
    referer = db.Column(db.Text)
    
    # Raw log data and parsed fields
    raw_log = db.Column(db.Text, nullable=False)
    parsed_fields = db.Column(JSONB)  # Additional parsed fields specific to log format
    
    # Processing metadata
    line_number = db.Column(db.Integer, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    anomalies = db.relationship('Anomaly', backref='log_entry', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert log entry to dictionary"""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'src_ip': str(self.src_ip) if self.src_ip else None,
            'dest_host': self.dest_host,
            'method': self.method,
            'url': self.url,
            'status_code': self.status_code,
            'response_size': self.response_size,
            'user_agent': self.user_agent,
            'referer': self.referer,
            'raw_log': self.raw_log,
            'parsed_fields': self.parsed_fields,
            'line_number': self.line_number,
            'anomalies': [anomaly.to_dict() for anomaly in self.anomalies]
        }


class Anomaly(db.Model):
    """Anomaly detection results"""
    __tablename__ = 'anomalies'
    
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    log_id = db.Column(UUID(as_uuid=True), db.ForeignKey('log_files.id'), nullable=False, index=True)
    entry_id = db.Column(db.BigInteger, db.ForeignKey('log_entries.id'), nullable=False, index=True)
    
    # Anomaly details
    anomaly_type = db.Column(db.String(100), nullable=False)  # volume, behavioral, temporal, pattern
    reason = db.Column(db.Text, nullable=False)
    confidence = db.Column(db.Float, nullable=False)  # 0.0 to 1.0
    severity = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    
    # ML model details
    model_used = db.Column(db.String(100))  # isolation_forest, lof, etc.
    feature_contributions = db.Column(JSONB)  # Which features contributed to anomaly
    
    # Contextual information
    context_window_start = db.Column(db.DateTime)
    context_window_end = db.Column(db.DateTime)
    related_entries_count = db.Column(db.Integer)
    
    # Timestamps
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert anomaly to dictionary"""
        return {
            'id': self.id,
            'entry_id': self.entry_id,
            'anomaly_type': self.anomaly_type,
            'reason': self.reason,
            'confidence': self.confidence,
            'severity': self.severity,
            'model_used': self.model_used,
            'feature_contributions': self.feature_contributions,
            'context_window_start': self.context_window_start.isoformat() if self.context_window_start else None,
            'context_window_end': self.context_window_end.isoformat() if self.context_window_end else None,
            'related_entries_count': self.related_entries_count,
            'detected_at': self.detected_at.isoformat()
        }


# Database indexes for performance
def create_indexes():
    """Create additional database indexes for performance"""
    from sqlalchemy import Index
    
    # Composite indexes for common queries
    Index('idx_log_entries_log_timestamp', LogEntry.log_id, LogEntry.timestamp)
    Index('idx_log_entries_src_ip_timestamp', LogEntry.src_ip, LogEntry.timestamp)
    Index('idx_anomalies_log_confidence', Anomaly.log_id, Anomaly.confidence.desc())
    Index('idx_anomalies_severity_detected', Anomaly.severity, Anomaly.detected_at.desc()) 