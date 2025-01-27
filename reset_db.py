from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Define your models here
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    pokemon_id = db.Column(db.String(50), nullable=False)

with app.app_context():
    # Drop all tables
    db.drop_all()
    print("All tables dropped.")

    # Recreate all tables
    db.create_all()
    print("All tables recreated.")