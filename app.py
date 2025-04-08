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
    # Ora di default "ALL" invece che "NONE"
    trade_condition = db.Column(db.String(20), nullable=False, default="ALL")

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

@app.route('/')
def index():
    return render_template('index.html')

# Registration route
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    hashed_password = generate_password_hash(data['password'])
    new_user = User(
        username=data['username'],
        email=data['email'],
        password=hashed_password,
        pokemon_id=data['pokemon_id'],
        trade_condition="ALL"  # Impostato di default alla creazione
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({
        "message": "User registered successfully!",
        "username": new_user.username,
        "email": new_user.email,
        "pokemon_id": new_user.pokemon_id,
        "trade_condition": new_user.trade_condition
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
            "pokemon_id": user.pokemon_id,
            "trade_condition": user.trade_condition  # <--- Key line
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
    user.email = new_email
    user.pokemon_id = new_pokemon_id
    user.password = generate_password_hash(new_password)

    # Make sure the request’s JSON includes 'trade_condition' if you want to allow changes
    new_trade_condition = data.get('trade_condition')
    if new_trade_condition in ["ALL", "COMMON", "NONE"]:
        user.trade_condition = new_trade_condition

    db.session.commit()
    return jsonify({"message": "Profile updated successfully!"})

###############################################################################
# OFFER POKEMON
###############################################################################
@app.route('/pokemon/offer', methods=['POST'])
def add_offer():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    pokemon_name = data.get('pokemon', '').strip()
    user_expansion = data.get('expansion', '').strip()
    user_rarity = data.get('rarity', '').strip()

    # ONLY fallback if user_expansion is truly empty
    if not user_expansion:
        user_expansion = get_expansion_for_pokemon(pokemon_name)

    # ONLY fallback if user_rarity is truly empty
    if not user_rarity:
        user_rarity = get_rarity_for_pokemon(pokemon_name)

    offer = Offer(
        user_id=user.id,
        pokemon=pokemon_name,
        expansion=user_expansion,
        rarity=user_rarity
    )
    db.session.add(offer)
    db.session.commit()

    partial_image = get_image_for_pokemon(pokemon_name, user_expansion, user_rarity)
    full_image_url = f"{BASE_URL}/{partial_image}" if partial_image else ""

    return jsonify({
        "message": f"Offered Pokémon {pokemon_name} (expansion={user_expansion}, rarity={user_rarity}) added!",
        "pokemon": pokemon_name,
        "expansion": user_expansion,
        "rarity": user_rarity,
        "image_url": full_image_url
    })

@app.route('/pokemon/offered', methods=['GET'])
def get_offered_pokemon():
    username = request.args.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    offers = Offer.query.filter_by(user_id=user.id).all()
    
    results = []
    for offer in offers:
        partial_image = get_image_for_pokemon(
            pokemon_name=offer.pokemon,
            expansion_name=offer.expansion,
            rarity_name=offer.rarity
        )
        full_image_url = f"{BASE_URL}/{partial_image}" if partial_image else ""
        results.append({
            "id": offer.id,
            "pokemon": offer.pokemon,
            "expansion": offer.expansion,
            "rarity": offer.rarity,
            "image_url": full_image_url
        })

    return jsonify(results)

@app.route('/pokemon/offer/delete', methods=['DELETE'])
def delete_offer():
    offer_id = request.json.get('offer_id')
    offer = Offer.query.filter_by(id=offer_id).first()
    if offer:
        db.session.delete(offer)
        db.session.commit()
        return jsonify({"message": "Offer deleted successfully!"})
    return jsonify({"message": "Offer not found!"}), 404

###############################################################################
# SEARCH POKEMON
###############################################################################
@app.route('/pokemon/search', methods=['POST'])
def add_search():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    pokemon_name = data.get('pokemon', '').strip()
    user_expansion = data.get('expansion', '').strip()
    user_rarity = data.get('rarity', '').strip()

    # ONLY fallback if user_expansion is truly empty
    if not user_expansion:
        user_expansion = get_expansion_for_pokemon(pokemon_name)

    # ONLY fallback if user_rarity is truly empty
    if not user_rarity:
        user_rarity = get_rarity_for_pokemon(pokemon_name)

    searched = Search(
        user_id=user.id,
        pokemon=pokemon_name,
        expansion=user_expansion,
        rarity=user_rarity
    )
    db.session.add(searched)
    db.session.commit()

    partial_image = get_image_for_pokemon(pokemon_name, user_expansion, user_rarity)
    full_image_url = f"{BASE_URL}/{partial_image}" if partial_image else ""

    return jsonify({
        "message": f"Searched Pokémon {pokemon_name} (expansion={user_expansion}, rarity={user_rarity}) added!",
        "pokemon": pokemon_name,
        "expansion": user_expansion,
        "rarity": user_rarity,
        "image_url": full_image_url
    })

@app.route('/pokemon/searched', methods=['GET'])
def get_searched_pokemon():
    username = request.args.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    searches = Search.query.filter_by(user_id=user.id).all()

    results = []
    for s in searches:
        partial_image = get_image_for_pokemon(
            pokemon_name=s.pokemon,
            expansion_name=s.expansion,
            rarity_name=s.rarity
        )
        full_image_url = f"{BASE_URL}/{partial_image}" if partial_image else ""

        results.append({
            "id": s.id,
            "pokemon": s.pokemon,
            "expansion": s.expansion,
            "rarity": s.rarity,
            "image_url": full_image_url
        })
    return jsonify(results)

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
# MAGIC MATCH
###############################################################################
@app.route('/pokemon/magical_match', methods=['GET'])
def magical_match():
    username = request.args.get('username')
    if not username:
        return jsonify({"message": "Please specify ?username=<value>"}), 400
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": f"User '{username}' not found"}), 404
    if user.trade_condition == "NONE":
        return jsonify({"message": "Your Trade Status is set on 'Cannot trade', update your Profile settings if you have enough points for trading!"}), 403
    user_offers = Offer.query.filter_by(user_id=user.id).all()
    user_wants = Search.query.filter_by(user_id=user.id).all()
    if user.trade_condition == "COMMON":
        user_offers = [o for o in user_offers if o.rarity in ["C", "U", "R"]]
    matches = []
    all_users = User.query.all()
    for other_user in all_users:
        if other_user.id == user.id:
            continue
        if other_user.trade_condition == "NONE":
            continue
        other_offers = Offer.query.filter_by(user_id=other_user.id).all()
        other_wants = Search.query.filter_by(user_id=other_user.id).all()
        if other_user.trade_condition == "COMMON":
            other_offers = [o for o in other_offers if o.rarity in ["C", "U", "R"]]
        trade_pairs = []
        for cardA in user_offers:
            if any(is_same_card(cardA, w) for w in other_wants):
                for cardB in other_offers:
                    if any(is_same_card(cardB, w) for w in user_wants):
                        if cardA.rarity == cardB.rarity:
                            trade_pairs.append((cardA, cardB))
        if trade_pairs:
            mySearch_TheirOffer_set = {f"{b.pokemon} ({b.expansion}, {b.rarity})" for (a, b) in trade_pairs}
            theirSearch_MyOffer_set = {f"{a.pokemon} ({a.expansion}, {a.rarity})" for (a, b) in trade_pairs}
            match_info = {
                "other_user": other_user.username,
                "other_user_pokemon_id": other_user.pokemon_id,
                "mySearch_TheirOffer": sorted(mySearch_TheirOffer_set),
                "theirSearch_MyOffer": sorted(theirSearch_MyOffer_set)
            }
            matches.append(match_info)
    return jsonify(matches)

def is_same_card(offer_or_search_obj, want_obj):
    """
    Checks if two objects describe the 'same card' by name + expansion + rarity.
    Adjust if you want partial matching (e.g. ignoring expansion).
    """
    return (offer_or_search_obj.pokemon == want_obj.pokemon
            and offer_or_search_obj.expansion == want_obj.expansion
            and offer_or_search_obj.rarity == want_obj.rarity)

###############################################################################
# GET POKEMON NAMES
###############################################################################
@app.route('/get_pokemon_names', methods=['GET'])
def get_pokemon_names():
    """
    Usage:
      1) ?list_expansions=true => returns a list of expansions only
      2) ?with_rarity=true     => returns combined strings "Name (Expansion, Rarity)"
         filtered by expansion if ?expansion=<value> is also given
      3) Else, if neither of the above, returns just the Pokémon names (the old logic).

    CSV structure:
      row[0] = Espansione
      row[1] = Nome
      row[2] = Rarità
      (optionally row[3] = Immagine, but unused here)
    """
    csv_path = os.path.join(app.root_path, 'static/files/Anagrafica_Pokemon.csv')

    list_expansions_flag = request.args.get('list_expansions', '').lower() == 'true'
    with_rarity_flag = request.args.get('with_rarity', '').lower() == 'true'
    expansion_param = request.args.get('expansion', '').strip().lower()

    expansions_set = set()
    results_list = []

    try:
        with open(csv_path, 'r') as file:
            csv_reader = csv.reader(file, delimiter=';')
            next(csv_reader, None)  # Skip header if present

            for row in csv_reader:
                if len(row) < 2:
                    continue  # We need at least [0]=Expansion, [1]=Name

                csv_expansion = row[0].strip()
                csv_expansion_lower = csv_expansion.lower()

                nome_pokemon = row[1].strip()
                # If available, get rarity
                csv_rarity = row[2].strip() if len(row) >= 3 else ""

                # Track expansions for the expansions-only list
                if csv_expansion_lower:
                    expansions_set.add(csv_expansion_lower)

                # If we're listing expansions => skip the rest of logic
                if list_expansions_flag:
                    continue

                # Check expansion filter
                if expansion_param and csv_expansion_lower != expansion_param:
                    continue

                if with_rarity_flag:
                    combo_str = f"{nome_pokemon} ({csv_expansion}, {csv_rarity})"
                    results_list.append(combo_str)
                else:
                    results_list.append(nome_pokemon)

    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    if list_expansions_flag:
        expansions_sorted = sorted([exp.capitalize() for exp in expansions_set])
        return jsonify(expansions_sorted)

    unique_sorted = sorted(set(results_list))
    return jsonify(unique_sorted)

###############################################################################
# HELPER FUNCTIONS
###############################################################################
BASE_URL = "https://assets.pokemon-zone.com/game-assets/CardPreviews"

def get_image_for_pokemon(pokemon_name, expansion_name, rarity_name):
    csv_path = os.path.join(app.root_path, 'static/files/Anagrafica_Pokemon.csv')
    
    name_lower = pokemon_name.strip().lower()
    expansion_lower = expansion_name.strip().lower()
    rarity_lower = rarity_name.strip().lower()

    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.reader(file, delimiter=';')
            header = next(csv_reader, None)  # skip header if present

            for row in csv_reader:
                if len(row) < 4:
                    continue
                csv_expansion = row[0].strip().lower()
                csv_name = row[1].strip().lower()
                csv_rarity = row[2].strip().lower()
                csv_image = row[3].strip()

                if (
                    csv_expansion == expansion_lower and
                    csv_name == name_lower and
                    csv_rarity == rarity_lower
                ):
                    return csv_image
    except FileNotFoundError:
        print("CSV file not found in get_image_for_pokemon.")
    except Exception as e:
        print("Error in get_image_for_pokemon:", e)

    return ""

def get_rarity_for_pokemon(pokemon_name):
    csv_path = os.path.join(app.root_path, 'static/files/Anagrafica_Pokemon.csv')
    name_lower = pokemon_name.strip().lower()
    try:
        with open(csv_path, 'r') as file:
            csv_reader = csv.reader(file, delimiter=';')
            header = next(csv_reader, None)
            for row in csv_reader:
                if len(row) < 3:
                    continue
                csv_name = row[1].strip().lower()
                csv_rarity = row[2].strip()
                if csv_name == name_lower:
                    return csv_rarity
    except FileNotFoundError:
        print("CSV non trovato.")
    except Exception as e:
        print("Errore in get_rarity_for_pokemon:", e)
    return ""

def get_expansion_for_pokemon(pokemon_name):
    csv_path = os.path.join(app.root_path, 'static/files/Anagrafica_Pokemon.csv')
    name_lower = pokemon_name.strip().lower()

    try:
        with open(csv_path, 'r') as file:
            csv_reader = csv.reader(file, delimiter=';')
            next(csv_reader, None)
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

@app.route('/user/trade_condition', methods=['PUT'])
def update_trade_condition():
    """
    Aggiorna la condizione di scambio dell'utente (ALL, COMMON, NONE)
    """
    data = request.json
    username = data.get('username')
    new_condition = data.get('trade_condition')

    if not username or not new_condition:
        return jsonify({"message": "username and trade_condition are required"}), 400

    if new_condition not in ["ALL", "COMMON", "NONE"]:
        return jsonify({"message": "Invalid trade_condition. Must be ALL, COMMON, or NONE."}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    user.trade_condition = new_condition
    db.session.commit()

    return jsonify({"message": f"Trade status updated to {new_condition} for user {username}."})

###############################################################################
# MAIN
###############################################################################
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)