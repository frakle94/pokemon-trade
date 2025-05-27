# app.py
import os
from pathlib import Path

from flask import Flask, request, redirect
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

from models import db                 # il tuo oggetto SQLAlchemy
from routes import routes_bp          # blueprint con tutte le route

# ------------------------------------------------------------------ #
# 1.  Load env vars from .env (dev only)                            #
# ------------------------------------------------------------------ #
load_dotenv()

# ------------------------------------------------------------------ #
# 2.  Common config                                                 #
# ------------------------------------------------------------------ #
BASEDIR         = Path(__file__).resolve().parent
SQLITE_FALLBACK = f"sqlite:///{BASEDIR / 'database.db'}"

class Config:
    SECRET_KEY                   = os.getenv("SECRET_KEY", "super-secret-key")
    SQLALCHEMY_DATABASE_URI      = os.getenv("SQLALCHEMY_DATABASE_URI", SQLITE_FALLBACK)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS    = {
        "pool_recycle": 280,
        "pool_pre_ping": True
    }

# ------------------------------------------------------------------ #
#  New domain and detection of old PythonAnywhere hostnames         #
# ------------------------------------------------------------------ #
NEW_DOMAIN       = os.getenv("NEW_DOMAIN", "pokemontcgptradeplatform.com")
OLD_SUFFIX       = ".pythonanywhere.com"

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ─── redirect old PA URLs to new domain ───────────────────────────
    @app.before_request
    def redirect_to_new_domain():
        host = request.host.split(":", 1)[0]  # strip port if any
        # if it's still on pythonanywhere.com, bounce to NEW_DOMAIN
        if host.endswith(OLD_SUFFIX):
            # build the new URL preserving path and query string
            new_url = request.url.replace(host, NEW_DOMAIN, 1)
            return redirect(new_url, code=301)

    # initialize db and register routes
    db.init_app(app)
    app.register_blueprint(routes_bp)
    return app

# ------------------------------------------------------------------ #
#  Local run                                                        #
# ------------------------------------------------------------------ #
if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=(os.getenv("FLASK_DEBUG", "0") == "1"))
