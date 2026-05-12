ACTIVITY_MULTIPLIERS = {
    'low'      : 1.2,
    'moderate' : 1.55,
    'high'     : 1.725
}


def calculate_bmr(gender, weight_kg, height_cm, age):
    """Mifflin-St Jeor Formula."""
    if gender.lower() == 'male':
        return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    else:
        return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161


def calculate_tdee(bmr, activity_level):
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level.lower(), 1.2)
    return bmr * multiplier


def adjust_for_goal(tdee, health_goal):
    if health_goal == 'weight_loss':
        return tdee - 500
    elif health_goal == 'weight_gain':
        return tdee + 500
    return tdee


def calculate_macros(daily_calories):
    """Returns daily macro targets in grams using 25/45/30 split."""
    return {
        'daily_calories' : round(daily_calories, 2),
        'protein_g'      : round((daily_calories * 0.25) / 4, 2),
        'carbs_g'        : round((daily_calories * 0.45) / 4, 2),
        'fat_g'          : round((daily_calories * 0.30) / 9, 2)
    }


def get_user_targets(profile):
    """Full pipeline: profile → daily nutrition targets."""
    bmr     = calculate_bmr(profile.gender, profile.weight_kg, profile.height_cm, profile.age)
    tdee    = calculate_tdee(bmr, profile.activity_level)
    daily   = adjust_for_goal(tdee, profile.health_goal)
    return calculate_macros(daily)


def generate_nutrition_tips(consumed, targets):
    """Rule-based nutrition tips comparing consumed vs target."""
    tips = []
    pct_calories = (consumed['calories'] / targets['daily_calories']) * 100 if targets['daily_calories'] else 0
    pct_protein  = (consumed['protein']  / targets['protein_g'])      * 100 if targets['protein_g']      else 0
    pct_carbs    = (consumed['carbs']    / targets['carbs_g'])         * 100 if targets['carbs_g']        else 0
    pct_fat      = (consumed['fat']      / targets['fat_g'])           * 100 if targets['fat_g']          else 0

    if pct_calories > 110:
        tips.append("You are exceeding your daily calorie target. Consider lighter meals.")
    elif pct_calories < 70:
        tips.append("You are consuming fewer calories than recommended for your goal.")

    if pct_protein < 80:
        tips.append("Your protein intake is below target. Add more protein-rich foods.")
    elif pct_protein >= 80:
        tips.append("Your protein intake is suitable for your goal.")

    if pct_carbs > 110:
        tips.append("Your carbohydrate intake is high. Consider reducing portion sizes.")

    if pct_fat > 110:
        tips.append("Your fat intake exceeds the daily target. Choose lower-fat options.")

    if not tips:
        tips.append("Your nutrition intake is well balanced for today.")

    return tips
