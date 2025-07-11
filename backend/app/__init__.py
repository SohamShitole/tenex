import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_restx import Api
from dotenv import load_dotenv
import logging
from celery import Celery

# Load environment variables
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()

# Configure Celery at import time so the worker container (which imports
# `app.celery`) gets a fully configured instance without relying on
# `create_app()` being called.
BROKER_URL = os.getenv('REDIS_URL', 'redis://redis:6379/0')

# Celery instance with Redis as both broker and backend
celery = Celery(__name__, broker=BROKER_URL, backend=BROKER_URL)


def init_celery(app: Flask):
    """Tie Celery tasks to the Flask application context."""

    class FlaskTask(celery.Task):
        def __call__(self, *args, **kwargs):  # type: ignore[override]
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = FlaskTask
    return celery


def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://logsight:logsight123@localhost:5432/logsight')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 900))
    app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-flask-secret-key')
    app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_FILE_SIZE', 104857600))  # 100MB
    app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', '/tmp/uploads')
    
    # Logging configuration
    log_level = os.getenv('LOG_LEVEL', 'INFO')
    logging.basicConfig(level=getattr(logging, log_level))
    
    # Initialize extensions with app
    db.init_app(app)
    jwt.init_app(app)
    
    # Configure CORS
    CORS(app, origins=[os.getenv('FRONTEND_URL', 'http://localhost:3000')])
    
    # Create upload directory if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Initialize API with documentation
    api = Api(
        app,
        version='1.0',
        title='Logsight API',
        description='AI-Powered Log Analytics & Anomaly Detection API',
        doc='/docs/',
        prefix='/api'
    )

    # ---- JWT Error Handling ----
    # Ensure authentication errors propagate as 401 instead of generic 500
    from flask_jwt_extended.exceptions import NoAuthorizationError, JWTExtendedException

    @api.errorhandler(NoAuthorizationError)  # Missing token / auth header
    def handle_no_auth(err):
        return {'message': str(err) or 'Authorization token is missing'}, 401

    @api.errorhandler(JWTExtendedException)  # Any other JWT-related error (including expired, invalid)
    def handle_jwt_error(err):
        # err.message may differ; use generic for security
        return {'message': str(err) or 'Authentication token error'}, 401
    
    # PyJWT exceptions may bubble up before Flask-JWT-Extended handles them
    from jwt.exceptions import ExpiredSignatureError as PyJWTExpiredSignatureError, InvalidTokenError as PyJWTInvalidTokenError

    @api.errorhandler(PyJWTExpiredSignatureError)  # Token expired (raised by PyJWT)
    def handle_pyjwt_expired(err):
        return {'message': 'Token has expired'}, 401

    @api.errorhandler(PyJWTInvalidTokenError)  # Any other invalid token errors
    def handle_pyjwt_invalid(err):
        return {'message': 'Invalid authentication token'}, 401
    
    # Import and register routes
    from app.routes.auth import auth_ns
    from app.routes.logs import logs_ns
    from app.routes.anomalies import anomalies_ns
    
    api.add_namespace(auth_ns, path='/auth')
    api.add_namespace(logs_ns, path='/logs')
    api.add_namespace(anomalies_ns, path='/anomalies')
    
    # Tie Celery to this Flask app context (only once per process)
    init_celery(app)

    # Create database tables
    with app.app_context():
        db.create_all()
        
        # Create default admin user if it doesn't exist
        from app.models import User
        admin_user = User.query.filter_by(email='admin@logsight.com').first()
        if not admin_user:
            admin_user = User(
                email='admin@logsight.com',
                username='admin'
            )
            admin_user.set_password('admin123')
            db.session.add(admin_user)
            db.session.commit()
            app.logger.info('Created default admin user: admin@logsight.com / admin123')
    
    @app.route('/health')
    def health_check():
        """Health check endpoint"""
        return {'status': 'healthy', 'version': '1.0.0'}
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True) 