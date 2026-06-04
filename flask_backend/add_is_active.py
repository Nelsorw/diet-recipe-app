import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur  = conn.cursor()

cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_name='user_profiles' AND column_name='is_active'
""")
exists = cur.fetchone()

if exists:
    print('Column is_active already exists — no action needed.')
else:
    cur.execute('ALTER TABLE user_profiles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE')
    conn.commit()
    print('Column is_active added to user_profiles successfully.')

conn.close()
