# app.py
import os
from pathlib import Path
from flask import request, redirect

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

from models import db                 # il tuo oggetto SQLAlchemy
from routes import routes_bp          # blueprint con tutte le route

# ------------------------------------------------------------------ #
# 1.  Carica variabili d’ambiente da .env se esiste (dev-only)       #
# ------------------------------------------------------------------ #
load_dotenv()                         # non fa nulla in produzione

# ------------------------------------------------------------------ #
# 2.  Config comuni                                                  #
# ------------------------------------------------------------------ #
BASEDIR          = Path(__file__).resolve().parent
SQLITE_FALLBACK  = f"sqlite:///{BASEDIR / 'database.db'}"

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key")
    SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI", SQLITE_FALLBACK)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 280,       # evita ‘MySQL server has gone away’
        "pool_pre_ping": True
    }

def create_app():
    app = Flask(__name__)
    
    # NEW_HOST = "www.pokemontcgptradeplatform.com"   # dominio finale

    # @app.before_request
    # def redirect_to_new_domain():
    #     host = request.host.split(":")[0]           # toglie eventuale porta
    #     if host.endswith(".pythonanywhere.com") and host != NEW_HOST:
    #         # preserva path + query string
    #         return redirect(f"https://{NEW_HOST}{request.full_path}", code=301)
    
    app.config.from_object(Config)

    # Inizializza db e blueprint
    db.init_app(app)
    app.register_blueprint(routes_bp)

    return app

# ------------------------------------------------------------------ #
# 3.  Avvio in locale                                                #
# ------------------------------------------------------------------ #
if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()            # crea tabelle sul DB scelto
    app.run(debug=os.getenv("FLASK_DEBUG", "0") == "1")