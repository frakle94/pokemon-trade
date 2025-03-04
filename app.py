from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os
import csv

# Base directory of your project
basedir = os.path.abspath(os.path.dirname(__file__))
# Absolute path to the database file
db_path = os.path.join(basedir, 'database.db')

app = Flask(__name__)
# Configure the database URI
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    pokemon_id = db.Column(db.String(50), nullable=False)

class Offer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    pokemon = db.Column(db.String(80), nullable=False)

# You can keep or remove this if you still need a "wanted" feature
class Want(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    pokemon = db.Column(db.String(80), nullable=False)

# New model for "searched" Pokémon
class Search(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    pokemon = db.Column(db.String(80), nullable=False)

# Frontend route
@app.route('/')
def index():
    return render_template('index.html')

# Registration route
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    hashed_password = generate_password_hash(data['password'])
    new_user = User(username=data['username'], password=hashed_password, pokemon_id=data['pokemon_id'])
    db.session.add(new_user)
    db.session.commit()
    return jsonify({
        "message": "User registered successfully!",
        "username": new_user.username,
        "pokemon_id": new_user.pokemon_id
    })

# Login route
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if user and check_password_hash(user.password, data['password']):
        return jsonify({
            "message": "Login successful!",
            "username": user.username,
            "pokemon_id": user.pokemon_id
        })
    return jsonify({"message": "Invalid username or password"}), 401

# Updates user credentials
@app.route('/user/update', methods=['PUT'])
def update_user():
    data = request.json
    old_username = data.get('old_username')
    new_username = data.get('username')
    new_pokemon_id = data.get('pokemon_id')
    new_password = data.get('password')

    user = User.query.filter_by(username=old_username).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    # Update fields
    user.username = new_username
    user.pokemon_id = new_pokemon_id
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

    offer = Offer(user_id=user.id, pokemon=data['pokemon'])
    db.session.add(offer)
    db.session.commit()
    return jsonify({"message": f"Offered Pokémon {data['pokemon']} added successfully!"})

# Get offered Pokémon
@app.route('/pokemon/offered', methods=['GET'])
def get_offered_pokemon():
    username = request.args.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    offers = Offer.query.filter_by(user_id=user.id).all()
    return jsonify([{"id": offer.id, "pokemon": offer.pokemon} for offer in offers])

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

# (Optional) Add wanted Pokémon
@app.route('/pokemon/wanted', methods=['POST'])
def add_wanted():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    want = Want(user_id=user.id, pokemon=data['pokemon'])
    db.session.add(want)
    db.session.commit()
    return jsonify({"message": f"Desired Pokémon {data['pokemon']} added successfully!"})

###############################################################################
# New Routes for "searchPokemon" logic (behaving like offerPokemon):
###############################################################################

# 1. Add (create) a "searched" Pokémon record
@app.route('/pokemon/search', methods=['POST'])
def add_search():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    searched = Search(user_id=user.id, pokemon=data['pokemon'])
    db.session.add(searched)
    db.session.commit()
    return jsonify({"message": f"Searched Pokémon {data['pokemon']} added successfully!"})

# 2. Get all "searched" Pokémon for the current user
@app.route('/pokemon/searched', methods=['GET'])
def get_searched_pokemon():
    username = request.args.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    searches = Search.query.filter_by(user_id=user.id).all()
    return jsonify([{"id": s.id, "pokemon": s.pokemon} for s in searches])

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

@app.route('/pokemon/magical_match', methods=['GET'])
def magical_match():
    """
    Finds TWO-SIDED matches for the given user.
    A two-sided match means:
      - The user has at least one search that matches the other user's offer.
      - The other user has at least one search that matches the user's offer.

    Query param: ?username=<the_user_who_wants_matches>

    Returns a JSON list; each item looks like:
    {
      "other_user": "User2",
      "other_user_pokemon_id": "XYZ123",
      "mySearch_TheirOffer": ["E"],        # what I want from them
      "theirSearch_MyOffer": ["A", "B"]    # what they want from me
    }
    """
    # 1. Get the username from query params
    username = request.args.get('username')
    if not username:
        return jsonify({"message": "Please specify ?username=<value>"}), 400

    # 2. Find the user
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": f"User '{username}' not found"}), 404

    # 3. Gather this user's offers and searches
    user_offers = Offer.query.filter_by(user_id=user.id).all()   # e.g. A, B, C
    user_searches = Search.query.filter_by(user_id=user.id).all() # e.g. D, E, F

    # Convert to sets of strings
    user_offers_set = {o.pokemon for o in user_offers}
    user_searches_set = {s.pokemon for s in user_searches}

    # 4. Check every other user for two-sided matches
    all_users = User.query.all()
    matches = []

    for other_user in all_users:
        if other_user.id == user.id:
            continue  # skip myself

        # Gather other user's offers and searches
        other_offers = Offer.query.filter_by(user_id=other_user.id).all()   # e.g. E, G, H
        other_searches = Search.query.filter_by(user_id=other_user.id).all() # e.g. A, E, F

        other_offers_set = {o.pokemon for o in other_offers}
        other_searches_set = {s.pokemon for s in other_searches}

        # 5. Two-sided intersection
        # What do *I* want from them? Intersection of my searches & their offers
        mySearch_TheirOffer = user_searches_set.intersection(other_offers_set)
        # What do *they* want from me? Intersection of their searches & my offers
        theirSearch_MyOffer = other_searches_set.intersection(user_offers_set)

        if mySearch_TheirOffer and theirSearch_MyOffer:
            # We have a two-sided match
            matches.append({
                "other_user": other_user.username,
                "other_user_pokemon_id": other_user.pokemon_id,  # included as requested
                "mySearch_TheirOffer": list(mySearch_TheirOffer),
                "theirSearch_MyOffer": list(theirSearch_MyOffer)
            })

    return jsonify(matches)

@app.route('/get_pokemon_names', methods=['GET'])
def get_pokemon_names():
    csv_path = os.path.join(app.root_path, 'static/files/Anagrafica_Pokemon.csv')
    nomi_pokemon = []

    try:
        with open(csv_path, 'r') as file:
            csv_reader = csv.reader(file, delimiter=';')
            next(csv_reader)  # Skip the header row if there is one
            for row in csv_reader:
                nomi_pokemon.append(row[1])
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify(nomi_pokemon)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create tables in the database if they don't exist
    app.run(debug=True)
