# routes.py

import os
import csv
from flask import Blueprint, request, jsonify, render_template, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer
from flask import Blueprint, request, jsonify
import smtplib
from email.message import EmailMessage
from datetime import datetime
from textwrap import dedent

# Import dal file "models.py"
from models import db, User, Offer, Search

# Import delle funzioni di utilità
from utils import (
    send_mail_with_mailjet,
    is_same_card,
    get_image_for_pokemon,
    get_rarity_for_pokemon,
    get_expansion_for_pokemon,
    send_mail,
    send_mail_with_retry,
    BASE_URL
)

# Crea un blueprint per raggruppare tutte le route
routes_bp = Blueprint('routes_bp', __name__)

# Crea un serializer per i token
SECRET_KEY = "super-secret-key"
s = URLSafeTimedSerializer(SECRET_KEY)

@routes_bp.route('/')
def index():
    return render_template('index.html')

@routes_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    hashed_password = generate_password_hash(data['password'])
    new_user = User(
        username=data['username'],
        email=data['email'],
        password=hashed_password,
        pokemon_id=data['pokemon_id'],
        trade_condition="ALL",
        login_time=datetime.utcnow()
    )
    db.session.add(new_user)
    db.session.commit()

    mail_sent = send_mail_with_retry(
        new_user.email,
        'Welcome to the Pokémon Trade Platform!',
        dedent(f"""\
Hi {new_user.username},

Welcome to the Pokémon Trade Platform!

Here are a few steps to help you get started:

1. Eventually move this email out of your Spam folder.

2. Log in to the platform: https://cescot.pythonanywhere.com/

3. Save the link as it was an app:
    • iPhone video guide:  https://www.youtube.com/watch?v=_1p-rVIOjYA  
    • Android video guide: https://www.youtube.com/watch?v=O1xEXKB6tNg

4. Update your "For Trade" and "Looking For" sections with your Pokémon needs.
 
5. Tap "Match" to find users who are up for a trade.

6. Add the user on the official Pokémon Pocket app.
 
7. Send the trade request and get the Pokémon you've been looking for!

We're growing fast, and it's all thanks to awesome traders like you!  
The more we grow, the better it gets for everyone, so feel free to share the link and keep trading!

Enjoy the process, and happy trading!

Best,  
Cesco_t
""")
)
    if not mail_sent:
        current_app.logger.warning(
            "Welcome e-mail permanently failed for user %s <%s>",
            new_user.username,
            new_user.email
        )

    return jsonify({
        "message": "You registered successfully.",
        "username": new_user.username,
        "email": new_user.email,
        "pokemon_id": new_user.pokemon_id,
        "trade_condition": new_user.trade_condition
    })

@routes_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email    = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password required"}), 400

    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password, password):
        # ─── Salva l’istante dell’accesso ───────────────────────
        user.login_time = datetime.utcnow()
        db.session.commit()
        # ────────────────────────────────────────────────────────
        return jsonify({
            "message": "Login successful!",
            "username": user.username,
            "email": user.email,
            "pokemon_id": user.pokemon_id,
            "trade_condition": user.trade_condition
        })
    return jsonify({"message": "Invalid email or password"}), 401

@routes_bp.route('/forgot-password', methods=['POST'])
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

@routes_bp.route('/reset-password/<token>', methods=['GET'])
def reset_password_form(token):
    return render_template('reset_password.html', token=token)

@routes_bp.route('/reset-password/<token>', methods=['POST'])
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

@routes_bp.route('/user/update', methods=['PUT'])
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

    new_trade_condition = data.get('trade_condition')
    if new_trade_condition in ["ALL", "COMMON", "NONE"]:
        user.trade_condition = new_trade_condition

    db.session.commit()
    return jsonify({"message": "Profile updated successfully!"})

@routes_bp.route('/pokemon/offer', methods=['POST'])
def add_offer():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    pokemon_name = data.get('pokemon', '').strip()
    user_expansion = data.get('expansion', '').strip()
    user_rarity = data.get('rarity', '').strip()

    if not user_expansion:
        user_expansion = get_expansion_for_pokemon(pokemon_name)
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

@routes_bp.route('/pokemon/offered', methods=['GET'])
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

@routes_bp.route('/pokemon/offer/delete', methods=['DELETE'])
def delete_offer():
    offer_id = request.json.get('offer_id')
    offer = Offer.query.filter_by(id=offer_id).first()
    if offer:
        db.session.delete(offer)
        db.session.commit()
        return jsonify({"message": "Offer deleted successfully!"})
    return jsonify({"message": "Offer not found!"}), 404

@routes_bp.route('/pokemon/search', methods=['POST'])
def add_search():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if not user:
        return jsonify({"message": "User not found!"}), 404

    pokemon_name = data.get('pokemon', '').strip()
    user_expansion = data.get('expansion', '').strip()
    user_rarity = data.get('rarity', '').strip()

    if not user_expansion:
        user_expansion = get_expansion_for_pokemon(pokemon_name)
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

@routes_bp.route('/pokemon/searched', methods=['GET'])
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

@routes_bp.route('/pokemon/search/delete', methods=['DELETE'])
def delete_search():
    search_id = request.json.get('search_id')
    searched = Search.query.filter_by(id=search_id).first()
    if searched:
        db.session.delete(searched)
        db.session.commit()
        return jsonify({"message": "Searched Pokémon entry deleted successfully!"})
    return jsonify({"message": "Searched Pokémon entry not found!"}), 404

@routes_bp.route('/pokemon/magical_match', methods=['GET'])
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
        user_offers = [o for o in user_offers if o.rarity in ["♦", "♦♦", "♦♦♦"]]

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
            other_offers = [o for o in other_offers if o.rarity in ["♦", "♦♦", "♦♦♦"]]

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
                "other_user_last_login": (
                    other_user.login_time.isoformat() if other_user.login_time else None
                ),
                "mySearch_TheirOffer": sorted(mySearch_TheirOffer_set),
                "theirSearch_MyOffer": sorted(theirSearch_MyOffer_set)
            }
            matches.append(match_info)

    return jsonify(matches)

@routes_bp.route('/user/trade_condition', methods=['PUT'])
def update_trade_condition():
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

@routes_bp.route('/get_pokemon_names', methods=['GET'])
def get_pokemon_names():
    csv_path = os.path.join(os.path.dirname(__file__), 'static', 'files', 'Anagrafica_Pokemon.csv')
    list_expansions_flag = request.args.get('list_expansions', '').lower() == 'true'
    with_rarity_flag = request.args.get('with_rarity', '').lower() == 'true'
    expansion_param = request.args.get('expansion', '').strip().lower()

    # New flag for rarities
    list_rarities_flag = request.args.get('list_rarities', '').lower() == 'true'

    expansions_set = set()
    rarities_set = set()
    results_list = []

    try:
        with open(csv_path, 'r') as file:
            csv_reader = csv.reader(file, delimiter=';')
            next(csv_reader, None)
            for row in csv_reader:
                if len(row) < 3:
                    continue

                csv_expansion = row[0].strip()
                nome_pokemon = row[1].strip()
                csv_rarity = row[2].strip()

                # Track expansions
                if csv_expansion:
                    expansions_set.add(csv_expansion.lower())

                # Track rarities
                if csv_rarity:
                    rarities_set.add(csv_rarity)

                # If user wants only expansions or rarities, skip building results_list
                if list_expansions_flag or list_rarities_flag:
                    continue

                csv_expansion_lower = csv_expansion.lower()
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

    # If user wants expansions
    if list_expansions_flag:
        expansions_sorted = sorted([exp.capitalize() for exp in expansions_set])
        return jsonify(expansions_sorted)

    # If user wants rarities
    if list_rarities_flag:
        rarities_sorted = sorted(rarities_set)
        return jsonify(rarities_sorted)

    unique_sorted = sorted(set(results_list))
    return jsonify(unique_sorted)

@routes_bp.route('/get_all_cards', methods=['GET'])
def get_all_cards():
    csv_path = os.path.join(os.path.dirname(__file__), 'static', 'files', 'Anagrafica_Pokemon.csv')
    cards = []
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.reader(file, delimiter=';')
            next(csv_reader, None)
            for row in csv_reader:
                if len(row) < 4:
                    continue
                exp = row[0].strip()
                name = row[1].strip()
                rar = row[2].strip()
                img = row[3].strip()
                cards.append({
                    "expansion": exp,
                    "name": name,
                    "rarity": rar,
                    "image_url": f"{BASE_URL}/{img}" if img else ""
                })
        return jsonify(cards)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@routes_bp.route('/send_pokeball', methods=['POST'])
def send_pokeball():
    data = request.get_json(silent=True) or {}
    from_username = data.get('from_username')
    to_username   = data.get('to_username')
    if not (from_username and to_username):
        return jsonify({'message': 'Missing usernames'}), 400

    recipient = User.query.filter_by(username=to_username).first()
    if not recipient or not recipient.email:
        return jsonify({'message': 'Recipient not found'}), 404

    try:
        send_mail(
            recipient.email,
            'You received a pokéball!',
            f'Hi {recipient.username},\n\n'
            f'you just received a pokéball from {from_username}, check the match on Pokémon Trade Platform!\n\n'
            'https://cescot.pythonanywhere.com/'
        )
        return jsonify({'message': 'Pokéball sent via email!'}), 200
    except Exception as exc:
        return jsonify({'message': f'Error sending email: {exc}'}), 500