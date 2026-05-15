from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db, bcrypt
from models.models import User
import random
import string

auth_bp = Blueprint('auth', __name__)


def generate_password(length: int = 10) -> str:
    """Generate a secure readable password like Login$5530."""
    prefix    = 'Login'
    digits    = ''.join(random.choices(string.digits, k=4))
    special   = random.choice('!@#$%&*')
    return f"{prefix}{special}{digits}"


def send_welcome_email(email: str, username: str, password: str) -> bool:
    """Send welcome email with generated password."""
    try:
        from flask_mail import Message
        from app import mail

        msg = Message(
            subject    = '🎉 Welcome to AI-based Diet & Recipe Recommendation App',
            recipients = [email],
            html       = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 0; }}
    .container {{ max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }}
    .header {{ background: #16a34a; padding: 32px 24px; text-align: center; }}
    .header h1 {{ color: white; margin: 0; font-size: 22px; }}
    .header p {{ color: #dcfce7; margin: 6px 0 0; font-size: 14px; }}
    .body {{ padding: 28px 24px; }}
    .greeting {{ font-size: 16px; color: #374151; margin-bottom: 16px; }}
    .credentials {{ background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 20px 0; }}
    .credentials table {{ width: 100%; border-collapse: collapse; }}
    .credentials td {{ padding: 8px 12px; font-size: 14px; }}
    .credentials td:first-child {{ color: #6b7280; font-weight: 600; width: 80px; }}
    .credentials td:last-child {{ color: #111827; font-weight: 700; }}
    .warning {{ background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #92400e; margin-top: 16px; }}
    .footer {{ text-align: center; padding: 16px; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; }}
    .logo {{ font-size: 32px; margin-bottom: 8px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🥗</div>
      <h1>Welcome to Diet & Recipe App</h1>
      <p>AI-based Personalized Nutrition Guidance</p>
    </div>
    <div class="body">
      <p class="greeting">Hello <strong>{username}</strong>,</p>
      <p style="color: #6b7280; font-size: 14px;">Your account has been created successfully. Use the credentials below to log in:</p>

      <div class="credentials">
        <table>
          <tr>
            <td>Email</td>
            <td>{email}</td>
          </tr>
          <tr>
            <td>Password</td>
            <td style="color: #16a34a; font-size: 16px;">{password}</td>
          </tr>
        </table>
      </div>

      <div class="warning">
        ⚠️ For your security, please change this password after your first login using the <strong>Forgot Password</strong> option.
      </div>

      <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
        If you did not register, please ignore this email.
      </p>
    </div>
    <div class="footer">
      © 2026 Diet & Recipe Recommendation App. All rights reserved.
    </div>
  </div>
</body>
</html>
"""
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f'Email error: {e}')
        return False


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('username'):
        return jsonify({'error': 'Username and email are required.'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered.'}), 409

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken.'}), 409

    # Generate secure password
    password = generate_password()
    hashed   = bcrypt.generate_password_hash(password).decode('utf-8')

    user = User(
        username      = data['username'].strip(),
        email         = data['email'].strip(),
        password_hash = hashed
    )

    db.session.add(user)
    db.session.commit()

    # Send welcome email
    email_sent = send_welcome_email(data['email'], data['username'], password)

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'message'   : 'Account created successfully. Check your email for your password.',
        'email_sent': email_sent,
        'token'     : token,
        'user'      : user.to_dict()
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=data['email']).first()

    if not user or not bcrypt.check_password_hash(user.password_hash, data['password']):
        return jsonify({'error': 'Invalid email or password.'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()}), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'message': 'Logged out successfully.'}), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    data    = request.get_json()

    if not data or not data.get('current_password') or not data.get('new_password'):
        return jsonify({'error': 'Current and new password are required.'}), 400

    if not bcrypt.check_password_hash(user.password_hash, data['current_password']):
        return jsonify({'error': 'Current password is incorrect.'}), 401

    if len(data['new_password']) < 6:
        return jsonify({'error': 'New password must be at least 6 characters.'}), 400

    user.password_hash = bcrypt.generate_password_hash(data['new_password']).decode('utf-8')
    db.session.commit()

    return jsonify({'message': 'Password changed successfully.'}), 200