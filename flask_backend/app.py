from flask import Flask, request, Response
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from routes.recipes import recipes_bp
from routes.upload import upload_bp
from dotenv import load_dotenv
from routes.notifications import notifications_bp
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone
from sqlalchemy import event
from sqlalchemy.engine import Engine
import sqlite3
import os

from flask_mail import Mail

load_dotenv()

db     = SQLAlchemy()
jwt    = JWTManager()
bcrypt = Bcrypt()
mail = Mail()


def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY']                  = os.getenv('SECRET_KEY', 'dev-secret')
    app.config['JWT_SECRET_KEY']              = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret')
    app.config['SQLALCHEMY_DATABASE_URI']     = os.getenv('DATABASE_URL', 'sqlite:///diet_app.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_ACCESS_TOKEN_EXPIRES']    = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS']   = {
        'connect_args': {'timeout': 30}
    }
    app.config['MAIL_SERVER']         = 'smtp.gmail.com'
    app.config['MAIL_PORT']           = 587
    app.config['MAIL_USE_TLS']        = True
    app.config['MAIL_USERNAME']       = os.getenv('MAIL_USERNAME', '')
    app.config['MAIL_PASSWORD']       = os.getenv('MAIL_PASSWORD', '')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME', '')



    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if isinstance(dbapi_connection, sqlite3.Connection):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=30000")
            cursor.close()

    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    @app.before_request
    def handle_options():
        if request.method == 'OPTIONS':
            res = Response()
            res.headers['Access-Control-Allow-Origin']  = '*'
            res.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            res.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
            return res

    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    mail.init_app(app)

    from routes.auth import auth_bp
    from routes.profile import profile_bp
    from routes.recommendations import recommendations_bp
    from routes.mealplan import mealplan_bp
    from routes.meal_log import logging_bp
    from routes.progress import progress_bp

    app.register_blueprint(auth_bp,            url_prefix='/auth')
    app.register_blueprint(profile_bp,         url_prefix='/profile')
    app.register_blueprint(recommendations_bp, url_prefix='/recommendations')
    app.register_blueprint(mealplan_bp,        url_prefix='/mealplan')
    app.register_blueprint(logging_bp,         url_prefix='/log')
    app.register_blueprint(progress_bp,        url_prefix='/progress')
    app.register_blueprint(recipes_bp,         url_prefix='/recipes')
    app.register_blueprint(upload_bp,          url_prefix='/upload')
    app.register_blueprint(notifications_bp,   url_prefix='/notifications')

    with app.app_context():
        db.create_all()

    flask_app = app

    def run_meal_reminders():
        from models.models import User
        from routes.notifications import generate_meal_reminders
        with flask_app.app_context():
            try:
                users = User.query.all()
                for user in users:
                    try:
                        generate_meal_reminders(user.id)
                    except Exception as e:
                        print(f"[Scheduler] Meal reminder error for user {user.id}: {e}")
                print(f"[Scheduler] Meal reminders ran at {datetime.now(timezone.utc)}")
            except Exception as e:
                print(f"[Scheduler] Fatal error: {e}")

    def run_log_reminder():
        from models.models import User
        from routes.notifications import send_log_reminder
        with flask_app.app_context():
            try:
                users = User.query.all()
                for user in users:
                    try:
                        send_log_reminder(user.id)
                    except Exception as e:
                        print(f"[Scheduler] Log reminder error for user {user.id}: {e}")
                print(f"[Scheduler] Log reminders ran at {datetime.now(timezone.utc)}")
            except Exception as e:
                print(f"[Scheduler] Fatal error: {e}")

    def run_streak_and_perfect():
        from models.models import User
        from routes.notifications import check_streak_milestone, check_perfect_day
        with flask_app.app_context():
            try:
                users = User.query.all()
                for user in users:
                    try:
                        check_streak_milestone(user.id)
                        check_perfect_day(user.id)
                    except Exception as e:
                        print(f"[Scheduler] Streak/perfect error for user {user.id}: {e}")
                print(f"[Scheduler] Streak/perfect ran at {datetime.now(timezone.utc)}")
            except Exception as e:
                print(f"[Scheduler] Fatal error: {e}")

    scheduler = BackgroundScheduler()
    # meal reminders — only at specific meal times
    scheduler.add_job(run_meal_reminders,    'cron',     hour=6,  minute=0, misfire_grace_time=3600, max_instances=1)
    scheduler.add_job(run_meal_reminders,    'cron',     hour=11, minute=0, misfire_grace_time=3600, max_instances=1)
    scheduler.add_job(run_meal_reminders,    'cron',     hour=17, minute=0, misfire_grace_time=3600, max_instances=1)
    # log reminder — only at 8am
    scheduler.add_job(run_log_reminder,      'cron',     hour=8,  minute=0, misfire_grace_time=3600, max_instances=1)
    # streak + perfect day — check hourly
    scheduler.add_job(run_streak_and_perfect,'interval', hours=1,           misfire_grace_time=3600, max_instances=1)
    scheduler.start()

    return app