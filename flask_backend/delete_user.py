import sqlite3
conn = sqlite3.connect('instance/diet_app.db')
conn.execute("DELETE FROM users WHERE email='vaultofscenes1@gmail.com'")
conn.commit()
conn.close()
print('User deleted!')