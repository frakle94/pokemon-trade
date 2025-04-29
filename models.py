# models.py

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    pokemon_id = db.Column(db.String(50), nullable=False)
    trade_condition = db.Column(db.String(20), nullable=False, default="ALL")
    login_time = db.Column(db.DateTime, nullable=True) 

class Offer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    pokemon = db.Column(db.String(80), nullable=False)
    expansion = db.Column(db.String(80), nullable=True)
    rarity = db.Column(db.String(80), nullable=True)

class Search(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    pokemon = db.Column(db.String(80), nullable=False)
    expansion = db.Column(db.String(80), nullable=True)
    rarity = db.Column(db.String(80), nullable=True)