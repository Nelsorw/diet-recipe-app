"""
NutriGuide Chatbot — powered by Groq (Llama 3).

Features:
- Profile-aware (health goal, dietary restrictions, health condition, targets)
- Knows today's meal logs and today's meal plan
- Ingredient-based recipe suggestions from the DB
- Saves conversation history per profile
- Multi-language: responds in the same language the user writes in
  (English and Kinyarwanda both work)
- Nutrition goal notifications via in-app notification system
"""
import os
import requests as http_requests
from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models.models import User, ChatMessage, MealLog, MealPlan, Recipe
from routes.profile import _get_active_profile
from utils.nutrition import get_user_targets

chat_bp = Blueprint('chat', __name__)

GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions'
GROQ_MODEL   = 'llama-3.3-70b-versatile'   # best free model on Groq
HISTORY_LIMIT = 20


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
    logged_meals = [f"{l.meal_type}: {l.recipe_name} ({round(l.calories)} kcal)" for l in logs]

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
- Detect the language of the user's message and respond in the SAME language
- You support English and Kinyarwanda fluently
- If the user writes in Kinyarwanda, respond fully in Kinyarwanda

INGREDIENT-BASED RECIPE SUGGESTIONS:
- When a user mentions ingredients (e.g. "I have rice, eggs, tomatoes"),
  suggest 2-3 practical recipe ideas using those ingredients
- Keep suggestions aligned with their dietary restrictions and health condition

TONE: Friendly, warm, concise. Use bullet points for lists.
Keep responses to 2-4 sentences for simple questions, more for complex ones.

STRICT BOUNDARIES — VERY IMPORTANT:
- You ONLY discuss: nutrition, food, recipes, meal planning, health goals, dietary advice, and the user's personal health data
- If the user asks about ANYTHING else (geography, history, politics, sports, technology, travel, universities, distances, general knowledge, etc.), you MUST politely decline and redirect
- When declining, say something like: "I'm NutriGuide, your nutrition assistant — I can only help with food, recipes, and health topics. Is there something nutrition-related I can help you with?"
- Do NOT answer off-topic questions even if you know the answer
- Do NOT apologize excessively — just redirect clearly and briefly

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


def _check_nutrition_notification(user_id, profile_id, targets, consumed):
    if not targets or not consumed:
        return
    cal_pct = (consumed.get('calories', 0) / targets.get('daily_calories', 1)) * 100
    if cal_pct >= 90:
        from routes.notifications import create_notification
        from models.models import Notification
        existing = Notification.query.filter(
            Notification.user_id    == user_id,
            Notification.profile_id == profile_id,
            Notification.type       == 'general',
            Notification.title.like('%calorie%'),
            Notification.created_at >= db.func.date('now')
        ).first()
        if not existing:
            create_notification(
                user_id,
                f"⚠️ {round(cal_pct)}% of daily calories reached",
                f"You've consumed {round(consumed['calories'])} of your {round(targets['daily_calories'])} kcal target. "
                f"Consider lighter options for your remaining meals.",
                'general',
                profile_id=profile_id
            )


@chat_bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)
    profile_id = profile.id if profile else None
    messages   = ChatMessage.query.filter_by(
        user_id=user_id, profile_id=profile_id
    ).order_by(ChatMessage.created_at.asc()).limit(100).all()
    return jsonify({'messages': [m.to_dict() for m in messages]}), 200


@chat_bp.route('/send', methods=['POST'])
@jwt_required()
def send_message():
    if not GROQ_API_KEY or GROQ_API_KEY == 'your-groq-api-key-here':
        return jsonify({'error': 'Groq API key not configured.'}), 503

    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)
    profile_id = profile.id if profile else None

    data    = request.get_json()
    message = (data.get('message') or '').strip()
    if not message:
        return jsonify({'error': 'Message is required.'}), 400

    targets = get_user_targets(profile) if profile else {}

    # save user message
    user_msg = ChatMessage(user_id=user_id, profile_id=profile_id, role='user', content=message)
    db.session.add(user_msg)
    db.session.commit()

    # ingredient detection
    ingredient_keywords = ['i have', 'using', 'with', 'ingredients', 'ndi na', 'mfite']
    has_ingredients = any(kw in message.lower() for kw in ingredient_keywords)
    recipe_context  = ''
    if has_ingredients:
        words = [w.strip('.,!?') for w in message.split() if len(w) > 3]
        found = _search_recipes_by_ingredients(words, profile.dietary_restrictions if profile else '')
        if found:
            recipe_context = '\n\n[RECIPES FROM APP DATABASE]\n'
            for r in found:
                recipe_context += f"- {r['name']} ({r['meal_type']}, {r['calories']} kcal)\n"
            recipe_context += 'Suggest these real recipes from the app.\n'

    # build message history for Groq
    history = ChatMessage.query.filter_by(
        user_id=user_id, profile_id=profile_id
    ).order_by(ChatMessage.created_at.desc()).limit(HISTORY_LIMIT).all()
    history.reverse()

    groq_messages = [{'role': 'system', 'content': _build_system_prompt(user, profile, targets)}]
    for msg in history[:-1]:   # exclude the message we just saved
        groq_messages.append({
            'role'   : 'user' if msg.role == 'user' else 'assistant',
            'content': msg.content
        })
    groq_messages.append({'role': 'user', 'content': message + recipe_context})

    try:
        resp = http_requests.post(
            GROQ_URL,
            headers={
                'Authorization': f'Bearer {GROQ_API_KEY}',
                'Content-Type' : 'application/json'
            },
            json={
                'model'      : GROQ_MODEL,
                'messages'   : groq_messages,
                'max_tokens' : 1024,
                'temperature': 0.7,
            },
            timeout=30
        )
        resp.raise_for_status()
        reply = resp.json()['choices'][0]['message']['content'].strip()

    except Exception as e:
        print(f'[Groq Error] {e}')
        reply = "I'm having trouble connecting right now. Please try again in a moment."

    # save assistant reply
    bot_msg = ChatMessage(user_id=user_id, profile_id=profile_id, role='assistant', content=reply)
    db.session.add(bot_msg)
    db.session.commit()

    # nutrition notification check
    if profile_id and targets:
        logs = MealLog.query.filter_by(
            user_id=user_id, profile_id=profile_id, log_date=date.today()
        ).all()
        consumed = {'calories': sum(l.calories for l in logs), 'protein': sum(l.protein for l in logs)}
        try:
            _check_nutrition_notification(user_id, profile_id, targets, consumed)
        except Exception:
            pass

    return jsonify({'reply': reply, 'message_id': bot_msg.id}), 200


@chat_bp.route('/clear', methods=['DELETE'])
@jwt_required()
def clear_history():
    user_id    = int(get_jwt_identity())
    user       = User.query.get_or_404(user_id)
    profile    = _get_active_profile(user)
    profile_id = profile.id if profile else None
    ChatMessage.query.filter_by(user_id=user_id, profile_id=profile_id).delete()
    db.session.commit()
    return jsonify({'message': 'Conversation cleared.'}), 200
