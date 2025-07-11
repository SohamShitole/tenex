from flask import request, current_app
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
from werkzeug.exceptions import BadRequest, Unauthorized

from app import db
from app.models import User

# Create namespace for authentication
auth_ns = Namespace('auth', description='Authentication operations')

# Define models for request/response validation
login_model = auth_ns.model('Login', {
    'email': fields.String(required=True, description='User email address'),
    'password': fields.String(required=True, description='User password')
})

register_model = auth_ns.model('Register', {
    'email': fields.String(required=True, description='User email address'),
    'username': fields.String(required=True, description='Username'),
    'password': fields.String(required=True, description='User password')
})

token_model = auth_ns.model('Token', {
    'access_token': fields.String(description='JWT access token'),
    'user': fields.Raw(description='User information')
})

user_model = auth_ns.model('User', {
    'id': fields.String(description='User ID'),
    'email': fields.String(description='User email'),
    'username': fields.String(description='Username'),
    'created_at': fields.String(description='Account creation date'),
    'is_active': fields.Boolean(description='Account status')
})


@auth_ns.route('/login')
class LoginResource(Resource):
    @auth_ns.expect(login_model)
    @auth_ns.marshal_with(token_model)
    @auth_ns.doc(responses={
        200: 'Success',
        401: 'Invalid credentials',
        400: 'Validation error'
    })
    def post(self):
        """Authenticate user and return JWT token"""
        try:
            data = request.get_json()
            
            if not data:
                auth_ns.abort(400, 'Request body is required')
            
            email = data.get('email', '').strip().lower()
            password = data.get('password', '')
            
            if not email or not password:
                auth_ns.abort(400, 'Email and password are required')
            
            # Find user by email
            user = User.query.filter_by(email=email).first()
            
            if not user or not user.check_password(password):
                auth_ns.abort(401, 'Invalid email or password')
            
            if not user.is_active:
                auth_ns.abort(401, 'Account is deactivated')
            
            # Create JWT token
            access_token = create_access_token(identity=str(user.id))
            
            current_app.logger.info(f'User {user.email} logged in successfully')
            
            return {
                'access_token': access_token,
                'user': user.to_dict()
            }
            
        except Exception as e:
            current_app.logger.error(f'Login error: {str(e)}')
            auth_ns.abort(500, 'Internal server error')


@auth_ns.route('/register')
class RegisterResource(Resource):
    @auth_ns.expect(register_model)
    @auth_ns.marshal_with(token_model)
    @auth_ns.doc(responses={
        201: 'User created successfully',
        400: 'Validation error',
        409: 'User already exists'
    })
    def post(self):
        """Register a new user"""
        try:
            data = request.get_json()
            
            if not data:
                auth_ns.abort(400, 'Request body is required')
            
            email = data.get('email', '').strip().lower()
            username = data.get('username', '').strip()
            password = data.get('password', '')
            
            if not email or not username or not password:
                auth_ns.abort(400, 'Email, username, and password are required')
            
            if len(password) < 6:
                auth_ns.abort(400, 'Password must be at least 6 characters long')
            
            # Check if user already exists
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                auth_ns.abort(409, 'User with this email already exists')
            
            # Create new user
            user = User(
                email=email,
                username=username
            )
            user.set_password(password)
            
            db.session.add(user)
            db.session.commit()
            
            # Create JWT token
            access_token = create_access_token(identity=str(user.id))
            
            current_app.logger.info(f'New user registered: {user.email}')
            
            return {
                'access_token': access_token,
                'user': user.to_dict()
            }, 201
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f'Registration error: {str(e)}')
            auth_ns.abort(500, 'Internal server error')


@auth_ns.route('/me')
class ProfileResource(Resource):
    @jwt_required()
    @auth_ns.marshal_with(user_model)
    @auth_ns.doc(responses={
        200: 'Success',
        401: 'Authentication required',
        404: 'User not found'
    })
    def get(self):
        """Get current user profile"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                auth_ns.abort(404, 'User not found')
            
            return user.to_dict()
            
        except Exception as e:
            current_app.logger.error(f'Profile error: {str(e)}')
            auth_ns.abort(500, 'Internal server error')


@auth_ns.route('/refresh')
class RefreshResource(Resource):
    @jwt_required()
    @auth_ns.marshal_with(token_model)
    @auth_ns.doc(responses={
        200: 'Token refreshed successfully',
        401: 'Authentication required'
    })
    def post(self):
        """Refresh JWT token"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user or not user.is_active:
                auth_ns.abort(401, 'Invalid user')
            
            # Create new JWT token
            access_token = create_access_token(identity=str(user.id))
            
            return {
                'access_token': access_token,
                'user': user.to_dict()
            }
            
        except Exception as e:
            current_app.logger.error(f'Token refresh error: {str(e)}')
            auth_ns.abort(500, 'Internal server error')


@auth_ns.route('/validate')
class ValidateResource(Resource):
    @jwt_required()
    @auth_ns.doc(responses={
        200: 'Token is valid',
        401: 'Token is invalid'
    })
    def get(self):
        """Validate JWT token"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user or not user.is_active:
                auth_ns.abort(401, 'Invalid token')
            
            return {'valid': True, 'user_id': str(user.id)}
            
        except Exception as e:
            current_app.logger.error(f'Token validation error: {str(e)}')
            auth_ns.abort(401, 'Invalid token') 