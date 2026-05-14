import os
from flask_mail import Message
from datetime import date

MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')


def get_email_html(title: str, body_html: str) -> str:
    """Wrap content in a professional email template."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 0; }}
        .container {{ max-width: 560px; margin: 32px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }}
        .header {{ background: #16a34a; padding: 24px 32px; }}
        .header h1 {{ color: white; margin: 0; font-size: 20px; font-weight: 800; }}
        .header p {{ color: #bbf7d0; margin: 4px 0 0; font-size: 12px; }}
        .body {{ padding: 28px 32px; }}
        .title {{ font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 12px; }}
        .body-text {{ font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 20px; white-space: pre-line; }}
        .nutrition-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }}
        .nutrition-card {{ background: #f0fdf4; border-radius: 10px; padding: 10px; text-align: center; }}
        .nutrition-card .value {{ font-size: 16px; font-weight: 800; color: #16a34a; }}
        .nutrition-card .label {{ font-size: 10px; color: #6b7280; margin-top: 2px; }}
        .meal-card {{ background: #f9fafb; border-radius: 12px; padding: 14px 16px; margin: 8px 0; border-left: 4px solid #16a34a; }}
        .meal-card .meal-type {{ font-size: 10px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.05em; }}
        .meal-card .meal-name {{ font-size: 14px; font-weight: 700; color: #111827; margin: 4px 0; }}
        .meal-card .meal-nutrition {{ font-size: 12px; color: #6b7280; }}
        .btn {{ display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 16px; }}
        .footer {{ background: #f9fafb; padding: 16px 32px; text-align: center; }}
        .footer p {{ font-size: 11px; color: #9ca3af; margin: 0; }}
        .badge {{ display: inline-block; background: #fef3c7; color: #d97706; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-bottom: 12px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>NutriGuide</h1>
          <p>Your personal nutrition assistant</p>
        </div>
        <div class="body">
          <p class="title">{title}</p>
          {body_html}
        </div>
        <div class="footer">
          <p>You received this because you have an account on NutriGuide.<br/>
          {date.today().strftime('%B %d, %Y')}</p>
        </div>
      </div>
    </body>
    </html>
    """


def send_notification_email(user_email: str, username: str, notif_type: str, title: str, body: str, extra_data: dict = None):
    """Send email for a notification."""
    try:
        from app import mail
        extra_data = extra_data or {}

        if notif_type == 'meal_reminder':
            body_html = f"""
            <div class="badge">Meal Reminder</div>
            <p class="body-text">Hi <strong>{username}</strong>, your {extra_data.get('meal_type', 'meal')} is coming up in 2 hours!</p>
            <div class="meal-card">
              <div class="meal-type">{extra_data.get('meal_type', 'meal').capitalize()}</div>
              <div class="meal-name">{extra_data.get('recipe_name', '')}</div>
              <div class="meal-nutrition">
                {round(extra_data.get('calories', 0))} kcal &nbsp;•&nbsp;
                Protein: {round(extra_data.get('protein', 0), 1)}g &nbsp;•&nbsp;
                Carbs: {round(extra_data.get('carbs', 0), 1)}g &nbsp;•&nbsp;
                Fat: {round(extra_data.get('fat', 0), 1)}g
              </div>
            </div>
            <a href="http://localhost:3000" class="btn">Open NutriGuide</a>
            """

        elif notif_type == 'log_reminder':
            body_html = f"""
            <div class="badge">Daily Reminder</div>
            <p class="body-text">Hi <strong>{username}</strong>,</p>
            <p class="body-text">You haven't logged any meals today. Tracking your meals helps you stay on top of your nutrition goals and maintain your streak!</p>
            <a href="http://localhost:3000" class="btn">Log a Meal Now</a>
            """

        elif notif_type == 'streak':
            body_html = f"""
            <div class="badge">Streak Milestone</div>
            <p class="body-text">Hi <strong>{username}</strong>,</p>
            <p class="body-text">{body}</p>
            <a href="http://localhost:3000" class="btn">Keep it Going</a>
            """

        elif notif_type == 'perfect_day':
            consumed = extra_data.get('consumed', {})
            body_html = f"""
            <div class="badge">Achievement Unlocked</div>
            <p class="body-text">Hi <strong>{username}</strong>, you hit all your nutrition targets today!</p>
            <div class="nutrition-grid">
              <div class="nutrition-card">
                <div class="value">{round(consumed.get('calories', 0))}</div>
                <div class="label">Calories</div>
              </div>
              <div class="nutrition-card">
                <div class="value">{round(consumed.get('protein', 0), 1)}g</div>
                <div class="label">Protein</div>
              </div>
              <div class="nutrition-card">
                <div class="value">{round(consumed.get('carbs', 0), 1)}g</div>
                <div class="label">Carbs</div>
              </div>
              <div class="nutrition-card">
                <div class="value">{round(consumed.get('fat', 0), 1)}g</div>
                <div class="label">Fat</div>
              </div>
            </div>
            <a href="http://localhost:3000" class="btn">View Progress</a>
            """

        elif notif_type == 'meal_plan':
            body_html = f"""
            <div class="badge">Meal Plan Ready</div>
            <p class="body-text">Hi <strong>{username}</strong>,</p>
            <p class="body-text">Your personalized weekly meal plan has been generated based on your health profile and nutrition targets. Check it out and start planning your meals!</p>
            <a href="http://localhost:3000/mealplan" class="btn">View Meal Plan</a>
            """

        else:
            body_html = f'<p class="body-text">{body}</p>'

        msg = Message(
            subject = title,
            recipients = [user_email],
            html    = get_email_html(title, body_html)
        )
        mail.send(msg)
        print(f"[Email] Sent to {user_email}: {title}")

    except Exception as e:
        print(f"[Email] Failed to send to {user_email}: {e}")