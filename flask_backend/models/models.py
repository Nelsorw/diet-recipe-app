from app import db
from datetime import datetime, timezone


class User(db.Model):
    __tablename__ = 'users'

    id              = db.Column(db.Integer, primary_key=True)
    email           = db.Column(db.String(120), unique=True, nullable=False)
    username        = db.Column(db.String(80), unique=True, nullable=False)
    password_hash   = db.Column(db.String(255), nullable=False)
    created_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    profile         = db.relationship('UserProfile', backref='user', uselist=False, cascade='all, delete-orphan')
    meal_logs       = db.relationship('MealLog', backref='user', lazy=True, cascade='all, delete-orphan')
    meal_plans      = db.relationship('MealPlan', backref='user', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id'         : self.id,
            'email'      : self.email,
            'username'   : self.username,
            'created_at' : self.created_at.isoformat()
        }


class UserProfile(db.Model):
    __tablename__ = 'user_profiles'

    id                    = db.Column(db.Integer, primary_key=True)
    user_id               = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    profile_image_url     = db.Column(db.String(500), nullable=True)
    full_name             = db.Column(db.String(120))
    age                   = db.Column(db.Integer, nullable=False)
    gender                = db.Column(db.String(10), nullable=False)
    weight_kg             = db.Column(db.Float, nullable=False)
    height_cm             = db.Column(db.Float, nullable=False)
    activity_level        = db.Column(db.String(20), nullable=False)
    health_goal           = db.Column(db.String(30), nullable=False)
    health_condition      = db.Column(db.String(50), nullable=False)
    dietary_restrictions  = db.Column(db.String(50), nullable=False)
    updated_at            = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'profile_image_url'    : self.profile_image_url,
            'full_name'            : self.full_name,
            'age'                  : self.age,
            'gender'               : self.gender,
            'weight_kg'            : self.weight_kg,
            'height_cm'            : self.height_cm,
            'activity_level'       : self.activity_level,
            'health_goal'          : self.health_goal,
            'health_condition'     : self.health_condition,
            'dietary_restrictions' : self.dietary_restrictions
        }


class MealLog(db.Model):
    __tablename__ = 'meal_logs'

    id            = db.Column(db.Integer, primary_key=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipe_name   = db.Column(db.String(255), nullable=False)
    meal_type     = db.Column(db.String(30), nullable=False)
    calories      = db.Column(db.Float, default=0)
    protein       = db.Column(db.Float, default=0)
    carbs         = db.Column(db.Float, default=0)
    fat           = db.Column(db.Float, default=0)
    logged_at     = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    log_date      = db.Column(db.Date, default=lambda: datetime.now(timezone.utc).date())

    def to_dict(self):
        return {
            'id'          : self.id,
            'recipe_name' : self.recipe_name,
            'meal_type'   : self.meal_type,
            'calories'    : self.calories,
            'protein'     : self.protein,
            'carbs'       : self.carbs,
            'fat'         : self.fat,
            'logged_at'   : self.logged_at.isoformat(),
            'log_date'    : self.log_date.isoformat()
        }


class MealPlan(db.Model):
    __tablename__ = 'meal_plans'

    id            = db.Column(db.Integer, primary_key=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipe_id     = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=True)
    plan_date     = db.Column(db.Date, nullable=False)
    meal_type     = db.Column(db.String(30), nullable=False)
    recipe_name   = db.Column(db.String(255), nullable=False)
    calories      = db.Column(db.Float, default=0)
    protein       = db.Column(db.Float, default=0)
    carbs         = db.Column(db.Float, default=0)
    fat           = db.Column(db.Float, default=0)
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id'          : self.id,
            'recipe_id'   : self.recipe_id,
            'plan_date'   : self.plan_date.isoformat(),
            'meal_type'   : self.meal_type,
            'recipe_name' : self.recipe_name,
            'calories'    : self.calories,
            'protein'     : self.protein,
            'carbs'       : self.carbs,
            'fat'         : self.fat
        }

class Recipe(db.Model):
    __tablename__ = 'recipes'

    id                  = db.Column(db.Integer, primary_key=True)
    name                = db.Column(db.String(500), nullable=False, default='')
    minutes             = db.Column(db.Integer, default=0)
    n_steps             = db.Column(db.Integer, default=0)
    steps               = db.Column(db.Text, default='')
    description         = db.Column(db.Text, default='')
    ingredients         = db.Column(db.Text, default='')
    n_ingredients       = db.Column(db.Integer, default=0)
    calories            = db.Column(db.Float, default=0)
    fat                 = db.Column(db.Float, default=0)
    sugar               = db.Column(db.Float, default=0)
    sodium              = db.Column(db.Float, default=0)
    protein             = db.Column(db.Float, default=0)
    saturated_fat       = db.Column(db.Float, default=0)
    carbs               = db.Column(db.Float, default=0)
    meal_type           = db.Column(db.String(50), default='')
    dish_type           = db.Column(db.String(50), default='')
    dietary_attributes  = db.Column(db.String(100), default='')
    image_url           = db.Column(db.String(500), nullable=True)

    def to_dict(self):
        return {
            'id'                : self.id,
            'name'              : self.name,
            'minutes'           : self.minutes,
            'n_steps'           : self.n_steps,
            'steps'             : self.steps,
            'description'       : self.description,
            'ingredients'       : self.ingredients,
            'n_ingredients'     : self.n_ingredients,
            'calories'          : self.calories,
            'fat'               : self.fat,
            'sugar'             : self.sugar,
            'sodium'            : self.sodium,
            'protein'           : self.protein,
            'saturated_fat'     : self.saturated_fat,
            'carbs'             : self.carbs,
            'meal_type'         : self.meal_type,
            'dish_type'         : self.dish_type,
            'dietary_attributes': self.dietary_attributes,
            'image_url'         : self.image_url
        }
    

class Notification(db.Model):
    __tablename__ = 'notifications'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title      = db.Column(db.String(255), nullable=False)
    body       = db.Column(db.Text, nullable=False)
    type       = db.Column(db.String(50), default='general')  # meal_reminder, streak, perfect_day, meal_plan, log_reminder
    is_read    = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id'        : self.id,
            'title'     : self.title,
            'body'      : self.body,
            'type'      : self.type,
            'is_read'   : self.is_read,
            'created_at': self.created_at.strftime('%Y-%m-%dT%H:%M:%S') + 'Z'
        }

class PushSubscription(db.Model):
    __tablename__ = 'push_subscriptions'

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    endpoint     = db.Column(db.Text, nullable=False)
    p256dh       = db.Column(db.Text, nullable=False)
    auth         = db.Column(db.Text, nullable=False)
    created_at   = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id'      : self.id,
            'endpoint': self.endpoint
        }