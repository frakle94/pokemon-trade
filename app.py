from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
#app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////home/CescoT/mysite/Trade_Pokemon/pokemon-trade/database.db'
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

class Want(db.Model):
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
    return jsonify({"message": "User registered successfully!", "username": new_user.username, "pokemon_id": new_user.pokemon_id})

# Login route
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if user and check_password_hash(user.password, data['password']):
        return jsonify({"message": "Login successful!", "username": user.username, "pokemon_id": user.pokemon_id})
    return jsonify({"message": "Invalid username or password"}), 401

# Update user profile
@app.route('/user/update', methods=['PUT'])
def update_user():
    data = request.json
    old_username = data.get('old_username')
    new_username = data.get('username')
    new_pokemon_id = data.get('pokemon_id')
    new_password = data.get('password')

    # Find the user by the old username
    user = User.query.filter_by(username=old_username).first()

    if not user:
        return jsonify({"message": "User not found!"}), 404

    # Update the user's details
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

# Add wanted Pokémon
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

# Search Pokémon
@app.route('/pokemon/search', methods=['GET'])
def search_pokemon():
    pokemon_name = request.args.get('name')
    offers = Offer.query.filter_by(pokemon=pokemon_name).all()
    results = []

    for offer in offers:
        user = User.query.filter_by(id=offer.user_id).first()
        if user:
            results.append({
                "username": user.username,
                "pokemon_id": user.pokemon_id,
                "pokemon": offer.pokemon
            })

    return jsonify(results)

if __name__ == '__main__':
    with app.app_context():  # Create application context
        db.create_all()  # Create tables in the database
    app.run(debug=True)