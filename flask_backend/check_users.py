import psycopg2
conn = psycopg2.connect('postgresql://postgres:123@localhost:5432/diet_app')
cur = conn.cursor()
cur.execute("SELECT id, username, email FROM users ORDER BY id")
for r in cur.fetchall():
    print(r)
conn.close()
