from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os
import csv
from dotenv import load_dotenv
from itsdangerous import URLSafeTimedSerializer
import requests

load_dotenv()

# Base directory of your project
basedir = os.path.abspath(os.path.dirname(__file__))
# Absolute path to the database file
db_path = os.path.join(basedir, 'database.db')

app = Flask(__name__)
# Configure the database URI
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

app.secret_key = "super-secret-key"
s = URLSafeTimedSerializer(app.secret_key)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    pokemon_id = db.Column(db.String(50), nullable=False)

class Offer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    pokemon = db.Column(db.String(80), nullable=False)
    expansion = db.Column(db.String(80), nullable=True)
    rarity = db.Column(db.String(80), nullable=True)

# class Want(db.Model):
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
#     pokemon = db.Column(db.String(80), nullable=False)

class Search(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    pokemon = db.Column(db.String(80), nullable=False)
    expansion = db.Column(db.String(80), nullable=True)
    rarity = db.Column(db.String(80), nullable=True)

@app.route('/')
def index():
    return render_template('index.html')

# Registration route
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    hashed_password = generate_password_hash(data['password'])
    new_user = User(username=data['username'], 
                    email=data['email'], 
                    password=hashed_password, 
                    pokemon_id=data['pokemon_id'])
    db.session.add(new_user)
    db.session.commit()
    return jsonify({
        "message": "User registered successfully!",
        "username": new_user.username,
        "email": new_user.email,
        "pokemon_id": new_user.pokemon_id
    })

# Login route
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({"message": "Email and password required"}), 400
    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password, password):
        return jsonify({
            "message": "Login successful!",
            "username": user.username,
            "email": user.email,
            "pokemon_id": user.pokemon_id
        })
    return jsonify({"message": "Invalid email or password"}), 401

def send_mail_with_mailjet(to_email, subject, text_body):
    """
    Sends an email using the Mailjet REST API.
    """
    api_key = os.getenv('MAILJET_API_KEY')
    api_secret = os.getenv('MAILJET_API_SECRET')
    if not api_key or not api_secret:
        raise ValueError("Missing Mailjet credentials (MAILJET_API_KEY or MAILJET_API_SECRET).")

    url = "https://api.mailjet.com/v3.1/send"
    data = {
        "Messages": [
            {
                "From": {
                    "Email": str(os.getenv('MAILJET_SENDER')),
                    "Name": "MyPokemonApp"
                },
                "To": [
                    {
                        "Email": to_email
                    }
                ],
                "Subject": subject,
                "TextPart": text_body
            }
        ]
    }
    response = requests.post(url, auth=(api_key, api_secret), json=data)
    response.raise_for_status()
    return response

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "No user with that email"}), 404

    token = s.dumps(email, salt='password-reset')
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5000')
    reset_url = f"{frontend_url}/reset-password/{token}"

    subject = "Pokémon Trade Password Reset"
    body = f"Hi {user.username}, click here to reset your password:\n{reset_url}"

    try:
        send_mail_with_mailjet(email, subject, body)
        return jsonify({"message": "Password reset email sent!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/reset-password/<token>', methods=['GET'])
def reset_password_form(token):
    return render_template('reset_password.html', token=token)

@app.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    try:
        email = s.loads(token, salt='password-reset', max_age=3600)
    except Exception:
        return jsonify({"message": "Invalid or expired token"}), 400

    data = request.json
    new_password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    user.password = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({"message": "Password reset successful!"})

# Updates user credentials
@app.route('/user/update', methods=['PUT'])
def update_user():
    data = request.json
    old_username = data.get('old_username')
    new_username = data.get('username')
    new_email = data.get('email')
    new_pokemon_id = data.get('pokemon_id')
    new_password = data.get('password')

    user = User.query.filter_by(username=old_username).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    user.username = new_username
    user.pokemon_id = new_pokemon_id
    user.email = new_email
    user.password = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({"message": "Profile updated successfully!"})


# Add a Pokémon offer
@app.route('/pokemon/offer', methods=['POST'])
def add_offer():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    # Prendi expansion inviato dal client, altrimenti stringa vuota
    expansion = data.get('expansion', '')
    pokemon_name = data['pokemon']
    
    # Ottieni la rarità dal CSV (resta invariato)
    rarity = get_rarity_for_pokemon(pokemon_name)
    
    # Se l'utente NON ha scelto nulla o ha "Select expansion" => leggi dal CSV
    if not expansion or expansion.lower() == 'select expansion':
        expansion = get_expansion_for_pokemon(pokemon_name)

    offer = Offer(
        user_id=user.id,
        pokemon=pokemon_name,
        expansion=expansion,  # Ora con eventuale fallback dal CSV
        rarity=rarity
    )
    db.session.add(offer)
    db.session.commit()
    return jsonify({"message": f"Offered Pokémon {pokemon_name} (expansion={expansion}, rarity={rarity}) added!"})

# Get offered Pokémon
@app.route('/pokemon/offered', methods=['GET'])
def get_offered_pokemon():
    username = request.args.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    offers = Offer.query.filter_by(user_id=user.id).all()
    return jsonify([
        {
            "id": offer.id,
            "pokemon": offer.pokemon,
            "expansion": offer.expansion,
            "rarity": offer.rarity
        }
        for offer in offers
    ])

# Delete Pokémon offer
@app.route('/pokemon/offer/delete', methods=['DELETE'])
def delete_offer():
    offer_id = request.json.get('offer_id')
    offer = Offer.query.filter_by(id=offer_id).first()
    if offer:
        db.session.delete(offer)
        db.session.commit()
        return jsonify({"message": "Offer deleted successfully!"})

    return jsonify({"message": "Offer not found!"}), 404

# # (Optional) Add wanted Pokémon
# @app.route('/pokemon/wanted', methods=['POST'])
# def add_wanted():
#     data = request.json
#     user = User.query.filter_by(username=data['username']).first()
#     if not user:
#         return jsonify({"message": "User not found!"}), 404

#     want = Want(user_id=user.id, pokemon=data['pokemon'])
#     db.session.add(want)
#     db.session.commit()
#     return jsonify({"message": f"Desired Pokémon {data['pokemon']} added successfully!"})

###############################################################################
# New Routes for "searchPokemon" logic (behaving like offerPokemon):
###############################################################################

# 1. Add (create) a "searched" Pokémon record (with expansion)
# Esempio in /pokemon/search (stessa logica in /pokemon/offer)

@app.route('/pokemon/search', methods=['POST'])
def add_search():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    expansion = data.get('expansion', '').strip()
    pokemon_name = data['pokemon']
    rarity = get_rarity_for_pokemon(pokemon_name)

    # Se l'utente NON ha scelto nulla o ha "Select expansion" => leggi dal CSV
    if not expansion or expansion.lower() == 'select expansion':
        expansion = get_expansion_for_pokemon(pokemon_name)

    searched = Search(
        user_id=user.id,
        pokemon=pokemon_name,
        expansion=expansion,
        rarity=rarity
    )
    db.session.add(searched)
    db.session.commit()
    return jsonify({
        "message": f"Searched Pokémon {pokemon_name} (expansion={expansion}, rarity={rarity}) added!"
    })

# 2. Get all "searched" Pokémon for the current user (include expansion)
@app.route('/pokemon/searched', methods=['GET'])
def get_searched_pokemon():
    username = request.args.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    searches = Search.query.filter_by(user_id=user.id).all()
    return jsonify([
        {
            "id": s.id,
            "pokemon": s.pokemon,
            "expansion": s.expansion,
            "rarity": s.rarity
        }
        for s in searches
    ])

# 3. Delete a "searched" Pokémon entry
@app.route('/pokemon/search/delete', methods=['DELETE'])
def delete_search():
    search_id = request.json.get('search_id')
    searched = Search.query.filter_by(id=search_id).first()

    if searched:
        db.session.delete(searched)
        db.session.commit()
        return jsonify({"message": "Searched Pokémon entry deleted successfully!"})

    return jsonify({"message": "Searched Pokémon entry not found!"}), 404

###############################################################################

def get_rarity_for_pokemon(pokemon_name):
    """
    Apre il CSV e cerca la rarità corrispondente a `pokemon_name`.
    Assumiamo che il CSV abbia:
      row[0] = espansione
      row[1] = nome
      row[2] = rarità
    """
    csv_path = os.path.join(app.root_path, 'static/files/Anagrafica_Pokemon.csv')
    # Normalizziamo il nome in minuscolo se nel CSV i nomi sono salvati minuscoli
    name_lower = pokemon_name.strip().lower()
    try:
        with open(csv_path, 'r') as file:
            csv_reader = csv.reader(file, delimiter=';')
            header = next(csv_reader, None)  # salta l'header
            for row in csv_reader:
                if len(row) < 3:
                    continue
                # row[1] = nome del Pokémon, row[2] = rarità
                csv_name = row[1].strip().lower()
                csv_rarity = row[2].strip()
                if csv_name == name_lower:
                    return csv_rarity
    except FileNotFoundError:
        print("CSV non trovato.")
    except Exception as e:
        print("Errore in get_rarity_for_pokemon:", e)
    return ""  # se non troviamo nulla

def get_expansion_for_pokemon(pokemon_name):
    """
    Legge il CSV e restituisce l'espansione associata a 'pokemon_name'.
    Se non trova nulla, restituisce stringa vuota.
    Assumiamo colonna 0 = espansione, colonna 1 = nome.
    """
    csv_path = os.path.join(app.root_path, 'static/files/Anagrafica_Pokemon.csv')
    name_lower = pokemon_name.strip().lower()

    try:
        with open(csv_path, 'r') as file:
            csv_reader = csv.reader(file, delimiter=';')
            next(csv_reader, None)  # salta l'header se presente

            for row in csv_reader:
                if len(row) < 2:
                    continue
                csv_expansion = row[0].strip()
                csv_name = row[1].strip().lower()

                if csv_name == name_lower:
                    return csv_expansion
    except FileNotFoundError:
        print("File not found for expansions.")
    except Exception as e:
        print("Errore get_expansion_for_pokemon:", e)
    return ""

@app.route('/pokemon/magical_match', methods=['GET'])
def magical_match():
    username = request.args.get('username')
    if not username:
        return jsonify({"message": "Please specify ?username=<value>"}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": f"User '{username}' not found"}), 404

    # 1) Offerte e ricerche di chi ha richiesto il match (creiamo set di triple)
    user_offers = Offer.query.filter_by(user_id=user.id).all()
    user_searches = Search.query.filter_by(user_id=user.id).all()

    user_offers_set = {
        (o.pokemon, o.rarity, o.expansion)
        for o in user_offers
    }
    user_searches_set = {
        (s.pokemon, s.rarity, s.expansion)
        for s in user_searches
    }

    matches = []
    all_users = User.query.all()

    for other_user in all_users:
        if other_user.id == user.id:
            continue  # Saltiamo noi stessi

        # 2) Offerte e ricerche dell’altro utente (anche qui triple)
        other_offers = Offer.query.filter_by(user_id=other_user.id).all()
        other_searches = Search.query.filter_by(user_id=other_user.id).all()

        other_offers_set = {
            (o.pokemon, o.rarity, o.expansion)
            for o in other_offers
        }
        other_searches_set = {
            (s.pokemon, s.rarity, s.expansion)
            for s in other_searches
        }

        # 3) Cosa io cerco e l’altro offre
        mySearch_TheirOffer = user_searches_set.intersection(other_offers_set)
        # 4) Cosa l’altro cerca e io offro
        theirSearch_MyOffer = other_searches_set.intersection(user_offers_set)

        # 5) Se entrambi non vuoti => match reciproco su nome, rarità e espansione
        if mySearch_TheirOffer and theirSearch_MyOffer:
            matches.append({
                "other_user": other_user.username,
                "other_user_pokemon_id": other_user.pokemon_id,
                # Convertiamo le triple in liste così il JSON è serializzabile
                "mySearch_TheirOffer": list(mySearch_TheirOffer),
                "theirSearch_MyOffer": list(theirSearch_MyOffer)
            })

    return jsonify(matches)

@app.route('/get_pokemon_names', methods=['GET'])
def get_pokemon_names():
    """
    1) Se query param ?list_expansions=true, restituisce la lista di espansioni distinte.
    2) Altrimenti, se c'è ?expansion=..., filtra i Pokémon solo per quell'espansione.
       Se non c'è expansion, restituisce TUTTI i Pokémon.

    Struttura CSV:
    row[0] = Espansione (minuscolo)
    row[1] = Nome Pokémon
    """
    csv_path = os.path.join(app.root_path, 'static/files/Anagrafica_Pokemon.csv')

    list_expansions_flag = request.args.get('list_expansions', '').lower() == 'true'
    expansion_param = request.args.get('expansion', '').strip().lower()

    expansions_set = set()
    pokemon_list = []

    try:
        with open(csv_path, 'r') as file:
            csv_reader = csv.reader(file, delimiter=';')
            next(csv_reader)  # Salta header se presente

            for row in csv_reader:
                # row[0] = Espansione, row[1] = NomePokémon
                if len(row) < 2:
                    continue

                espansione = row[0].strip().lower()
                nome_pokemon = row[1].strip()

                # Aggiungo l'espansione al set
                if espansione:
                    expansions_set.add(espansione)

                # Se NON stiamo listando expansions, calcoliamo la logica di filtraggio
                if not list_expansions_flag:
                    # Se expansion_param è vuoto => prendi tutti
                    if (not expansion_param) or (espansione == expansion_param):
                        pokemon_list.append(nome_pokemon)

    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    if list_expansions_flag:
        # Ritorno solo la lista expansions
        expansions_sorted = sorted([exp.capitalize() for exp in expansions_set])
        return jsonify(expansions_sorted)

    # Altrimenti ritorno i Pokémon (filtrati o tutti)
    return jsonify(pokemon_list)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
