"""Run once to promote a user to admin: python make_admin.py <username>"""
import sys
from app import create_app
from models.models import User
from app import db

app = create_app()
with app.app_context():
    username = sys.argv[1] if len(sys.argv) > 1 else input('Username to promote: ').strip()
    user = User.query.filter_by(username=username).first()
    if not user:
        print(f'User "{username}" not found.')
    else:
        user.is_admin = True
        db.session.commit()
        print(f'✓ {user.username} ({user.email}) is now an admin.')
