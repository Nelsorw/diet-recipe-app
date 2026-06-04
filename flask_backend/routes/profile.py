from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from app import db
from models.models import User, UserProfile
from utils.nutrition import get_user_targets

profile_bp = Blueprint('profile', __name__)

VALID_ACTIVITY   = {'low', 'moderate', 'high'}
VALID_GOALS      = {'weight_loss', 'weight_gain', 'healthy_living'}
VALID_GENDERS    = {'male', 'female'}

VALID_CONDITIONS = {
    'No Specific Condition', 'High Blood Pressure',
    'Type 2 Diabetes', 'Heart Disease'
}

VALID_RESTRICTIONS = {
    'Unrestricted', 'Gluten-Free', 'Dairy & Egg Free',
    'Egg-Free', 'Dairy-Free'
}


def _validate_profile(data):
    required = ['full_name', 'date_of_birth', 'gender', 'weight_kg',
                'height_cm', 'activity_level', 'health_goal',
                'health_condition', 'dietary_restrictions']
    for field in required:
        if field not in data:
            return f'{field} is required.'

    if data['gender'] not in VALID_GENDERS:
        return f"gender must be one of: {', '.join(VALID_GENDERS)}"
    if data['activity_level'] not in VALID_ACTIVITY:
        return f"activity_level must be one of: {', '.join(VALID_ACTIVITY)}"
    if data['health_goal'] not in VALID_GOALS:
        return f"health_goal must be one of: {', '.join(VALID_GOALS)}"
    if data['health_condition'] not in VALID_CONDITIONS:
        return f"health_condition must be one of: {', '.join(VALID_CONDITIONS)}"
    if data['dietary_restrictions'] not in VALID_RESTRICTIONS:
        return f"dietary_restrictions must be one of: {', '.join(VALID_RESTRICTIONS)}"

    try:
        dob = date.fromisoformat(data['date_of_birth'])
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if not (1 <= age <= 120):
            return 'Age must be between 1 and 120.'
    except ValueError:
        return 'Invalid date_of_birth format. Use YYYY-MM-DD.'

    return None


def _get_active_profile(user):
    if user.active_profile_id:
        profile = UserProfile.query.filter_by(
            id=user.active_profile_id, user_id=user.id
        ).first()
        if profile:
            return profile
    # fallback to first profile
    return UserProfile.query.filter_by(user_id=user.id).first()


@profile_bp.route('', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    profile = _get_active_profile(user)

    if not profile:
        return jsonify({'error': 'No profile found. Please create one.'}), 404

    targets = get_user_targets(profile)
    return jsonify({
        'profile'       : profile.to_dict(),
        'username'      : user.username,
        'daily_targets' : targets
    }), 200


@profile_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_profiles():
    user_id  = int(get_jwt_identity())
    user     = User.query.get_or_404(user_id)
    profiles = UserProfile.query.filter_by(user_id=user_id).all()
    return jsonify({
        'profiles'         : [p.to_dict() for p in profiles],
        'active_profile_id': user.active_profile_id
    }), 200


@profile_bp.route('', methods=['POST'])
@jwt_required()
def create_profile():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    data    = request.get_json()

    error = _validate_profile(data)
    if error:
        return jsonify({'error': error}), 400

    dob = date.fromisoformat(data['date_of_birth'])

    profile = UserProfile(
        user_id              = user_id,
        profile_name         = data.get('profile_name', 'My Profile'),
        full_name            = data['full_name'],
        date_of_birth        = dob,
        gender               = data['gender'],
        weight_kg            = float(data['weight_kg']),
        height_cm            = float(data['height_cm']),
        activity_level       = data['activity_level'],
        health_goal          = data['health_goal'],
        health_condition     = data['health_condition'],
        dietary_restrictions = data['dietary_restrictions']
    )

    db.session.add(profile)
    db.session.flush()

    # always set newly created profile as active
    user.active_profile_id = profile.id

    db.session.commit()

    # Notify admins about new profile
    try:
        from models.models import AdminNotification
        notif = AdminNotification(
            type        = 'new_profile',
            title       = '📋 New Profile Created',
            body        = f'{user.username} created a new profile: "{data.get("profile_name", "My Profile")}" ({data.get("full_name", "")}).',
            ref_user_id = user_id,
        )
        db.session.add(notif)
        db.session.commit()
    except Exception:
        pass

    targets = get_user_targets(profile)
    return jsonify({
        'message'       : 'Profile created.',
        'profile'       : profile.to_dict(),
        'user'          : user.to_dict(),
        'daily_targets' : targets
    }), 201


@profile_bp.route('/<int:profile_id>', methods=['PUT'])
@jwt_required()
def update_profile(profile_id):
    user_id = int(get_jwt_identity())
    profile = UserProfile.query.filter_by(id=profile_id, user_id=user_id).first()

    if not profile:
        return jsonify({'error': 'Profile not found.'}), 404

    data  = request.get_json()
    error = _validate_profile(data)
    if error:
        return jsonify({'error': error}), 400

    dob = date.fromisoformat(data['date_of_birth'])

    profile.profile_name         = data.get('profile_name', profile.profile_name)
    profile.full_name            = data['full_name']
    profile.date_of_birth        = dob
    profile.gender               = data['gender']
    profile.weight_kg            = float(data['weight_kg'])
    profile.height_cm            = float(data['height_cm'])
    profile.activity_level       = data['activity_level']
    profile.health_goal          = data['health_goal']
    profile.health_condition     = data['health_condition']
    profile.dietary_restrictions = data['dietary_restrictions']

    if 'profile_image_url' in data:
        profile.profile_image_url = data['profile_image_url']

    db.session.commit()

    targets = get_user_targets(profile)
    return jsonify({
        'message'       : 'Profile updated.',
        'profile'       : profile.to_dict(),
        'daily_targets' : targets
    }), 200


@profile_bp.route('/<int:profile_id>/switch', methods=['POST'])
@jwt_required()
def switch_profile(profile_id):
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    profile = UserProfile.query.filter_by(id=profile_id, user_id=user_id).first()

    if not profile:
        return jsonify({'error': 'Profile not found.'}), 404

    if not profile.is_active:
        return jsonify({'error': 'Cannot switch to a suspended profile.'}), 400

    user.active_profile_id = profile_id
    db.session.commit()

    targets = get_user_targets(profile)
    return jsonify({
        'message'       : f'Switched to {profile.profile_name}.',
        'profile'       : profile.to_dict(),
        'daily_targets' : targets
    }), 200


@profile_bp.route('/<int:profile_id>/suspend', methods=['POST'])
@jwt_required()
def suspend_profile(profile_id):
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    profile = UserProfile.query.filter_by(id=profile_id, user_id=user_id).first()

    if not profile:
        return jsonify({'error': 'Profile not found.'}), 404

    # Cannot suspend the active profile — must switch first
    if user.active_profile_id == profile_id:
        return jsonify({'error': 'Cannot suspend the active profile. Switch to another profile first.'}), 400

    profile.is_active = not profile.is_active
    db.session.commit()

    action = 'suspended' if not profile.is_active else 'reactivated'
    return jsonify({
        'message'  : f'Profile {action}.',
        'is_active': profile.is_active,
        'profile'  : profile.to_dict()
    }), 200


@profile_bp.route('/<int:profile_id>', methods=['DELETE'])
@jwt_required()
def delete_profile(profile_id):
    user_id  = int(get_jwt_identity())
    user     = User.query.get_or_404(user_id)
    profile  = UserProfile.query.filter_by(id=profile_id, user_id=user_id).first()

    if not profile:
        return jsonify({'error': 'Profile not found.'}), 404

    profiles = UserProfile.query.filter_by(user_id=user_id).all()
    if len(profiles) <= 1:
        return jsonify({'error': 'Cannot delete your only profile.'}), 400

    db.session.delete(profile)

    if user.active_profile_id == profile_id:
        remaining = UserProfile.query.filter_by(user_id=user_id).filter(
            UserProfile.id != profile_id
        ).first()
        user.active_profile_id = remaining.id if remaining else None

    db.session.commit()
    return jsonify({'message': 'Profile deleted.'}), 200


@profile_bp.route('/image', methods=['PUT'])
@jwt_required()
def update_profile_image():
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    profile = _get_active_profile(user)

    if not profile:
        return jsonify({'error': 'Profile not found.'}), 404

    data = request.get_json()
    if not data or 'profile_image_url' not in data:
        return jsonify({'error': 'profile_image_url is required.'}), 400

    profile.profile_image_url = data['profile_image_url']
    db.session.commit()

    return jsonify({
        'message'          : 'Profile image updated.',
        'profile_image_url': profile.profile_image_url
    }), 200