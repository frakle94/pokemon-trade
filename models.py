# models.py
from datetime import datetime
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
    given_badges     = db.relationship('GoodTrader',
                         foreign_keys='GoodTrader.giver_id',
                         back_populates='giver',   cascade='all, delete-orphan')
    received_badges  = db.relationship('GoodTrader',
                         foreign_keys='GoodTrader.receiver_id',
                         back_populates='receiver',cascade='all, delete-orphan')

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
    
class GoodTrader(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    giver_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    timestamp   = db.Column(db.DateTime, default=datetime.utcnow)

    giver    = db.relationship('User', foreign_keys=[giver_id],    back_populates='given_badges')
    receiver = db.relationship('User', foreign_keys=[receiver_id], back_populates='received_badges')

    __table_args__ = (
        db.UniqueConstraint('giver_id', 'receiver_id', name='uix_giver_receiver'),
        db.Index('ix_goodtrader_receiver', 'receiver_id'),
    )