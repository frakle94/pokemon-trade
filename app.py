# app.py
import os
from pathlib import Path
from flask import Flask, request, redirect
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

from models import db                 # il tuo oggetto SQLAlchemy
from routes import routes_bp          # blueprint con tutte le route

# ------------------------------------------------------------------ #
# 1. Load environment variables from .env (dev-only)               #
# ------------------------------------------------------------------ #
load_dotenv()

# ------------------------------------------------------------------ #
# 2. Common config                                                 #
# ------------------------------------------------------------------ #
BASEDIR         = Path(__file__).resolve().parent
SQLITE_FALLBACK = f"sqlite:///{BASEDIR / 'database.db'}"

class Config:
    SECRET_KEY                    = os.getenv("SECRET_KEY", "super-secret-key")
    SQLALCHEMY_DATABASE_URI       = os.getenv("SQLALCHEMY_DATABASE_URI", SQLITE_FALLBACK)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS     = {
        "pool_recycle": 280,       # evita ‘MySQL server has gone away’
        "pool_pre_ping": True
    }

# ------------------------------------------------------------------ #
# 3. Redirect old PA domain to new custom domain                    #
# ------------------------------------------------------------------ #
NEW_DOMAIN = os.getenv("NEW_DOMAIN", "pokemontcgtradeplatform.com")
OLD_SUFFIX = ".pythonanywhere.com"

# ------------------------------------------------------------------ #
# 4. Application factory                                            #
# ------------------------------------------------------------------ #
def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # redirect any request on the old PythonAnywhere hostname
    @app.before_request
    def redirect_old_domain():
        host = request.host.split(":", 1)[0].lower()
        if host.endswith(OLD_SUFFIX):
            # preserve path and query string
            return redirect(f"https://{NEW_DOMAIN}{request.full_path}", code=301)

    # initialize db and register routes
    db.init_app(app)
    app.register_blueprint(routes_bp)

    return app

# ------------------------------------------------------------------ #
# 5. Local run                                                      #
# ------------------------------------------------------------------ #
if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()            # crea tabelle sul DB scelto
    app.run(debug=os.getenv("FLASK_DEBUG", "0") == "1")