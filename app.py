# app.py
import os
from pathlib import Path

from flask import Flask, request, redirect        #  ← added request, redirect
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

from models import db
from routes import routes_bp

# ------------------------------------------------------------------ #
# 1.  Load environment variables                                     #
# ------------------------------------------------------------------ #
load_dotenv()

# ------------------------------------------------------------------ #
# 2.  Common config                                                  #
# ------------------------------------------------------------------ #
BASEDIR          = Path(__file__).resolve().parent
SQLITE_FALLBACK  = f"sqlite:///{BASEDIR / 'database.db'}"

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key")
    SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI", SQLITE_FALLBACK)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 280,
        "pool_pre_ping": True
    }

# ------------------------------------------------------------------ #

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Inizializza db e blueprint
    db.init_app(app)
    app.register_blueprint(routes_bp)
    # ----------------------------------------------------------------

    return app

# ------------------------------------------------------------------ #
# 3.  Local run                                                      #
# ------------------------------------------------------------------ #
if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=os.getenv("FLASK_DEBUG", "0") == "1")