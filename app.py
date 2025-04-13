# app.py

import os
from flask import Flask
from dotenv import load_dotenv

from models import db
from routes import routes_bp

def create_app():
    load_dotenv()
    app = Flask(__name__)

    # Configurazione della chiave segreta
    app.secret_key = "super-secret-key"

    # Configurazione del database
    basedir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(basedir, 'database.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Inizializza il db con l'app
    db.init_app(app)

    # Registra il blueprint con tutte le route
    app.register_blueprint(routes_bp)

    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True)