"""
Delete a user and all their data from PostgreSQL.
Edit the email below and run: python delete_user.py
"""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

EMAIL = 'daphineu2004@gmail.com'

conn = psycopg2.connect(os.getenv('DATABASE_URL', 'postgresql://postgres:123@localhost:5432/diet_app'))
cur = conn.cursor()

cur.execute("SELECT id FROM users WHERE email = %s", (EMAIL,))
row = cur.fetchone()
if not row:
    print(f"No user found with email: {EMAIL}")
else:
    user_id = row[0]
    # Delete child records first
    cur.execute("DELETE FROM model_predictions WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = %s)", (user_id,))
    cur.execute("DELETE FROM chat_sessions WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM notifications WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM meal_logs WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM meal_plans WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM saved_recipes WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM otp_tokens WHERE email = %s", (EMAIL,))
    cur.execute("DELETE FROM user_profiles WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
    conn.commit()
    print(f"User {EMAIL} (id={user_id}) and all their data deleted!")

conn.close()
