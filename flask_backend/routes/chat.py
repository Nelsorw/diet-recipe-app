"""
NutriGuide Chatbot — powered by Groq (Llama 3).
Supports named chat sessions per profile.
"""
import os
import requests as http_requests
from datetime import date, datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models.models import User, ChatMessage, ChatSession, MealLog, MealPlan, Recipe
from routes.profile import _get_active_profile
from utils.nutrition import get_user_targets

chat_bp = Blueprint('chat', __name__)

GROQ_API_KEY  = os.getenv('GROQ_API_KEY', '')
GROQ_URL      = 'https://api.groq.com/openai/v1/chat/completions'
GROQ_MODEL    = 'llama-3.3-70b-versatile'
HISTORY_LIMIT = 20

# Kinyarwanda common words for detection
KINYARWANDA_WORDS = {
    'ndi', 'ndashaka', 'mfite', 'numva', 'mbere', 'none', 'ariko', 'kandi',
    'neza', 'cyane', 'bite', 'ese', 'oya', 'yego', 'murakaza', 'murakoze',
    'amakuru', 'muraho', 'mbwira', 'nabona', 'nshobora', 'ndagukunda',
    'ibiryo', 'indwara', 'ubuzima', 'kurya', 'kunywa', 'protein', 'calories',
    'ifu', 'umuceri', 'inyama', 'imbuto', 'imboga', 'amata', 'amazi',
    'uburo', 'ibijumba', 'isombe', 'igitoki', 'dore', 'nkunda', 'nagira',
    'nakora', 'ngabanye', 'ibiro', 'guteka', 'amajima', 'nifuza', 'nzima',
    'bifasha', 'birashimishije', 'ndangira', 'ibyo', 'ntibishoboka',
    'nagomba', 'gukora', 'kugirango', 'ndashimiye', 'murakoze', 'nurangiza'
}

def _detect_kinyarwanda(text: str) -> bool:
    """Detect if text is likely Kinyarwanda based on common words."""
    words = set(text.lower().split())
    matches = words & KINYARWANDA_WORDS
    return len(matches) >= 1  # even one match is enough for short messages

def _translate(text: str, source: str, target: str) -> str:
    """Translate text using Google Translate via deep-translator. Returns original on failure."""
    try:
        from deep_translator import GoogleTranslator
        return GoogleTranslator(source=source, target=target).translate(text) or text
    except Exception as e:
        print(f'[Translate] {source}->{target} error: {e}')
        return text


def _get_or_create_session(user_id, profile_id, session_id=None):
    """Return the requested session, or create a new one."""
    if session_id:
        session = ChatSession.query.filter_by(
            id=session_id, user_id=user_id, profile_id=profile_id
        ).first()
        if session:
            return session
    # create new session
    session = ChatSession(user_id=user_id, profile_id=profile_id, title='New Chat')
    db.session.add(session)
    db.session.commit()
    return session


def _auto_title(session, first_user_message: str):
    """Set session title from first user message if still default."""
    if session.title == 'New Chat':
        title = first_user_message[:50].strip()
        if len(first_user_message) > 50:
            title += '...'
        session.title = title
        db.session.commit()


def _build_system_prompt(user, profile, targets) -> str:
    today      = date.today().isoformat()
    profile_id = profile.id if profile else None

    logs = MealLog.query.filter_by(
        user_id=user.id, profile_id=profile_id, log_date=date.today()
    ).all() if profile_id else []

    consumed = {
        'calories': round(sum(l.calories for l in logs), 1),
        'protein' : round(sum(l.protein  for l in logs), 1),
        'carbs'   : round(sum(l.carbs    for l in logs), 1),
        'fat'     : round(sum(l.fat      for l in logs), 1),
    }
    logged_meals  = [f"{l.meal_type}: {l.recipe_name} ({round(l.calories)} kcal)" for l in logs]

    plans = MealPlan.query.filter_by(
        user_id=user.id, profile_id=profile_id, plan_date=date.today()
    ).all() if profile_id else []
    planned_meals = [f"{p.meal_type}: {p.recipe_name} ({round(p.calories)} kcal)" for p in plans]

    remaining_cal = max(0, round((targets.get('daily_calories', 0) - consumed['calories']), 1)) if targets else 0
    remaining_pro = max(0, round((targets.get('protein_g', 0) - consumed['protein']), 1)) if targets else 0

    profile_info = ''
    if profile:
        profile_info = f"""
Active Profile: {profile.profile_name}
Name: {profile.full_name or user.username}
Age: {profile.age or 'unknown'} | Gender: {profile.gender}
Weight: {profile.weight_kg} kg | Height: {profile.height_cm} cm
Health Goal: {profile.health_goal.replace('_', ' ').title()}
Activity Level: {profile.activity_level.title()}
Health Condition: {profile.health_condition}
Dietary Restrictions: {profile.dietary_restrictions}"""

    targets_info = ''
    if targets:
        targets_info = f"""
Daily Targets:
  Calories: {targets.get('daily_calories', 0)} kcal | Protein: {targets.get('protein_g', 0)}g
  Carbs: {targets.get('carbs_g', 0)}g | Fat: {targets.get('fat_g', 0)}g"""

    today_info = f"""
Today ({today}):
  Logged: {', '.join(logged_meals) if logged_meals else 'None yet'}
  Consumed: {consumed['calories']} kcal | P:{consumed['protein']}g | C:{consumed['carbs']}g | F:{consumed['fat']}g
  Remaining: ~{remaining_cal} kcal | ~{remaining_pro}g protein
  Meal plan: {', '.join(planned_meals) if planned_meals else 'Not generated yet'}"""

    return f"""You are NutriGuide, a friendly AI nutrition assistant built into a diet and recipe app.

USER CONTEXT:
Username: {user.username}{profile_info}{targets_info}{today_info}

YOUR CAPABILITIES:
1. Answer nutrition and health questions
2. Suggest recipes based on ingredients the user mentions
3. Analyze daily intake vs targets and give advice
4. Help with meal planning and motivation
5. Warn when user is close to exceeding nutrition targets

LANGUAGE:
- Always respond in English (translation is handled externally if needed)

INGREDIENT-BASED RECIPE SUGGESTIONS:
- When a user mentions ingredients (e.g. "I have rice, eggs, tomatoes"),
  suggest 2-3 practical recipe ideas using those ingredients
- Keep suggestions aligned with their dietary restrictions and health condition

TONE: Friendly, warm, concise. Use bullet points for lists.
Keep responses to 2-4 sentences for simple questions, more for complex ones.

STRICT BOUNDARIES — VERY IMPORTANT:
- You ONLY discuss: nutrition, food, recipes, meal planning, health goals, dietary advice, and the user's personal health data
- If the user asks about ANYTHING else (geography, history, politics, sports, technology, travel, universities, distances, general knowledge, etc.), you MUST politely decline and redirect
- When declining, say: "I'm NutriGuide, your nutrition assistant, I can only help with food, recipes, and health topics. Is there something nutrition-related I can help you with?"
- Do NOT answer off-topic questions even if you know the answer

IMPORTANT: You are NOT a medical doctor. For serious health conditions, recommend consulting a healthcare professional."""


def _search_recipes_by_ingredients(ingredients: list, dietary: str, limit: int = 3) -> list:
    if not ingredients:
        return []
    from sqlalchemy import or_
    query = Recipe.query
    if dietary and dietary.lower() != 'unrestricted':
        query = query.filter(Recipe.dietary_attributes.ilike(f'%{dietary}%'))
    conditions = [Recipe.ingredients.ilike(f'%{ing.strip()}%') for ing in ingredients[:5]]
    query = query.filter(or_(*conditions))
    recipes = query.limit(20).all()
    if not recipes:
        return []
    scored = []
    for r in recipes:
        ing_text = (r.ingredients or '').lower()
        score    = sum(1 for ing in ingredients if ing.lower() in ing_text)
        scored.append((score, r))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {'name': r.name, 'calories': round(r.calories or 0), 'meal_type': r.meal_type, 'id': r.id}
        for _, r in scored[:limit]
    ]


# ── Session management routes ─────────────────────────────────────────────────

@chat_bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)
    profile_id = profile.id if profile else None

    sessions = ChatSession.query.filter_by(
        user_id=user_id, profile_id=profile_id
    ).order_by(ChatSession.updated_at.desc()).all()

    return jsonify({'sessions': [s.to_dict() for s in sessions]}), 200


@chat_bp.route('/sessions', methods=['POST'])
@jwt_required()
def create_session():
    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)
    profile_id = profile.id if profile else None

    data  = request.get_json() or {}
    title = data.get('title', 'New Chat')

    session = ChatSession(user_id=user_id, profile_id=profile_id, title=title)
    db.session.add(session)
    db.session.commit()
    return jsonify({'session': session.to_dict()}), 201


@chat_bp.route('/sessions/<int:session_id>', methods=['PUT'])
@jwt_required()
def rename_session(session_id):
    user_id = int(get_jwt_identity())
    session = ChatSession.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({'error': 'Session not found.'}), 404

    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Title is required.'}), 400

    session.title = title[:100]
    db.session.commit()
    return jsonify({'session': session.to_dict()}), 200


@chat_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@jwt_required()
def delete_session(session_id):
    user_id = int(get_jwt_identity())
    session = ChatSession.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({'error': 'Session not found.'}), 404
    db.session.delete(session)
    db.session.commit()
    return jsonify({'message': 'Session deleted.'}), 200


@chat_bp.route('/sessions/<int:session_id>/messages', methods=['GET'])
@jwt_required()
def get_session_messages(session_id):
    user_id = int(get_jwt_identity())
    session = ChatSession.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({'error': 'Session not found.'}), 404

    messages = ChatMessage.query.filter_by(session_id=session_id)\
        .order_by(ChatMessage.created_at.asc()).all()
    return jsonify({'messages': [m.to_dict() for m in messages]}), 200


# ── Send message ──────────────────────────────────────────────────────────────

@chat_bp.route('/send', methods=['POST'])
@jwt_required()
def send_message():
    if not GROQ_API_KEY or GROQ_API_KEY == 'your-groq-api-key-here':
        return jsonify({'error': 'Groq API key not configured.'}), 503

    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)
    profile_id = profile.id if profile else None

    data       = request.get_json()
    message    = (data.get('message') or '').strip()
    session_id = data.get('session_id')

    if not message:
        return jsonify({'error': 'Message is required.'}), 400

    # ── Language detection & translation ──────────────────────────────────
    is_kinyarwanda  = _detect_kinyarwanda(message)
    message_for_groq = _translate(message, 'rw', 'en') if is_kinyarwanda else message

    # get or create session
    session = _get_or_create_session(user_id, profile_id, session_id)
    targets = get_user_targets(profile) if profile else {}

    # save user message (original language)
    user_msg = ChatMessage(
        user_id=user_id, profile_id=profile_id,
        session_id=session.id, role='user', content=message
    )
    db.session.add(user_msg)

    # auto-title session from first message
    _auto_title(session, message)

    # update session timestamp
    session.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    # ingredient detection — use translated English for better keyword matching
    ingredient_keywords = ['i have', 'using', 'with', 'ingredients', 'ndi na', 'mfite']
    has_ingredients = any(kw in message.lower() for kw in ingredient_keywords) or \
                      any(kw in message_for_groq.lower() for kw in ['i have', 'using', 'ingredients'])
    recipe_context  = ''
    if has_ingredients:
        words = [w.strip('.,!?') for w in message_for_groq.split() if len(w) > 3]
        found = _search_recipes_by_ingredients(words, profile.dietary_restrictions if profile else '')
        if found:
            recipe_context = '\n\n[RECIPES FROM APP DATABASE]\n'
            for r in found:
                recipe_context += f"- {r['name']} ({r['meal_type']}, {r['calories']} kcal)\n"
            recipe_context += 'Suggest these real recipes from the app.\n'

    # build message history — always send English to Groq
    history = ChatMessage.query.filter_by(session_id=session.id)\
        .order_by(ChatMessage.created_at.desc()).limit(HISTORY_LIMIT).all()
    history.reverse()

    groq_messages = [{'role': 'system', 'content': _build_system_prompt(user, profile, targets)}]
    for msg in history[:-1]:
        content = msg.content
        # translate stored Kinyarwanda messages back to English for Groq context
        if _detect_kinyarwanda(content):
            content = _translate(content, 'rw', 'en')
        groq_messages.append({
            'role'   : 'user' if msg.role == 'user' else 'assistant',
            'content': content
        })
    groq_messages.append({'role': 'user', 'content': message_for_groq + recipe_context})

    try:
        resp = http_requests.post(
            GROQ_URL,
            headers={'Authorization': f'Bearer {GROQ_API_KEY}', 'Content-Type': 'application/json'},
            json={'model': GROQ_MODEL, 'messages': groq_messages, 'max_tokens': 1024, 'temperature': 0.7},
            timeout=30
        )
        resp.raise_for_status()
        reply_en = resp.json()['choices'][0]['message']['content'].strip()
        # Translate response back to Kinyarwanda if user wrote in Kinyarwanda
        reply = _translate(reply_en, 'en', 'rw') if is_kinyarwanda else reply_en
    except Exception as e:
        print(f'[Groq Error] {e}')
        reply = "Hari ikibazo cy'itumanaho. Gerageza nyuma gato." if is_kinyarwanda else "I'm having trouble connecting right now. Please try again in a moment."

    # save assistant reply
    bot_msg = ChatMessage(
        user_id=user_id, profile_id=profile_id,
        session_id=session.id, role='assistant', content=reply
    )
    db.session.add(bot_msg)
    session.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    # nutrition notification check
    if profile_id and targets:
        logs = MealLog.query.filter_by(
            user_id=user_id, profile_id=profile_id, log_date=date.today()
        ).all()
        consumed = {'calories': sum(l.calories for l in logs), 'protein': sum(l.protein for l in logs)}
        try:
            cal_pct = (consumed['calories'] / targets.get('daily_calories', 1)) * 100
            if cal_pct >= 90:
                from routes.notifications import create_notification
                from models.models import Notification
                existing = Notification.query.filter(
                    Notification.user_id    == user_id,
                    Notification.profile_id == profile_id,
                    Notification.type       == 'general',
                    Notification.title.like('%calorie%')
                ).first()
                if not existing:
                    create_notification(
                        user_id,
                        f"⚠️ {round(cal_pct)}% of daily calories reached",
                        f"You've consumed {round(consumed['calories'])} of your {round(targets['daily_calories'])} kcal target.",
                        'general', profile_id=profile_id
                    )
        except Exception:
            pass

    return jsonify({
        'reply'     : reply,
        'session_id': session.id,
        'session'   : session.to_dict()
    }), 200


# ── Legacy clear (kept for compatibility) ────────────────────────────────────
@chat_bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_history():
    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)
    profile_id = profile.id if profile else None
    ChatMessage.query.filter_by(user_id=user_id, profile_id=profile_id).delete()
    ChatSession.query.filter_by(user_id=user_id, profile_id=profile_id).delete()
    db.session.commit()
    return jsonify({'message': 'All conversations cleared.'}), 200
