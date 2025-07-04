# routes.py
from sqlalchemy import func 
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
from datetime import datetime, timedelta
import re
from sqlalchemy.exc import IntegrityError


# Import dal file "models.py"
from models import db, User, Offer, Search, GoodTrader

# Import delle funzioni di utilità
from utils import (
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
    data = request.get_json(force=True) or {}

    # ---- extract & strip -------------------------------------------------
    username   = (data.get('username')   or '').strip()
    email      = (data.get('email')      or '').strip().lower()
    password   =  data.get('password')   or ''
    pokemon_id = (data.get('pokemon_id') or '').strip()

    # ---- quick validation ------------------------------------------------
    if not (username and email and password and pokemon_id):
        return jsonify(message="All fields are required."), 400

    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        return jsonify(message="Invalid email address."), 400

    if not (pokemon_id.isdigit() and len(pokemon_id) == 16):
        return jsonify(message="Pokémon ID must be 16 digits."), 400

    # ---- uniqueness ------------------------------------------------------
    if User.query.filter_by(username=username).first():
        return jsonify(message="Username already taken."), 409
    if User.query.filter_by(email=email).first():
        return jsonify(message="An account with this email already exists."), 409

    # ---- create user -----------------------------------------------------
    new_user = User(
        username=username,
        email=email,
        password=generate_password_hash(password),
        pokemon_id=pokemon_id,
        trade_condition="ALL",
        login_time=datetime.utcnow()
    )
    db.session.add(new_user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(message="Username or email already registered."), 409

    mail_sent = send_mail_with_retry(
        new_user.email,
        'Welcome to the Pokémon TCGP Trade Platform!',
        dedent(f"""\
Hi {new_user.username},

Welcome to the Pokémon TCGP Trade Platform!

Here are a few steps to help you get started:

1. Eventually move this email out of your Spam folder.

2. Log in to the platform: https://pokemontcgptradeplatform.com/

3. Save the link so it becomes an app with its own icon on your smartphone:
    • iPhone video guide:  https://www.youtube.com/watch?v=_1p-rVIOjYA  
    • Android video guide: https://www.youtube.com/watch?v=O1xEXKB6tNg

4. Update your "For Trade" and "Looking For" sections with your Pokémon needs.
 
5. Tap "Match" to find users who are up for a trade.

6. Add the user as a friend on the official Pokémon Pocket app.
 
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
        "trade_condition": new_user.trade_condition,
        "badges_received": 0
    })

@routes_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(force=True) or {}
    email    = (data.get('email')    or '').strip().lower()
    password =  data.get('password') or ''

    if not (email and password):
        return jsonify(message="Email and password required."), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(message="Email not found."), 404
    if not check_password_hash(user.password, password):
        return jsonify(message="Incorrect password."), 401

    user.login_time = datetime.utcnow()
    db.session.commit()

    badges_received = GoodTrader.query.filter_by(receiver_id=user.id).count()

    return jsonify({
        "message": "Login successful.",
        "username": user.username,
        "email": user.email,
        "pokemon_id": user.pokemon_id,
        "trade_condition": user.trade_condition,
        "badges_received": badges_received
    })

@routes_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()

    # risposta “neutra” per evitare user-enumeration
    generic_ok = jsonify({"message": "If the address exists, instructions were sent."})

    user = User.query.filter_by(email=email).first()
    if not user:
        return generic_ok, 200          # esce qui se l’email non è registrata

    token = s.dumps(email, salt='password-reset')
    reset_url = f"{request.host_url.rstrip('/')}/reset-password/{token}"

    subject = "Pokémon TCGP Trade Platform – reset your password"
    body    = (
        f"Hi {user.username},\n\n"
        "Click the link below to reset your password (valid for 1 hour):\n"
        f"{reset_url}\n\n"
        "If you didn’t request it, just ignore this email."
    )

    ok = send_mail_with_retry(user.email, subject, body)   # 🔄 usa Gmail + retry

    if not ok:                                             # log in caso di fallimento
        current_app.logger.error(
            "Pwd-reset mail error for %s: delivery failed", user.email
        )

    return generic_ok, 200

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
    """
    1-for-1 matches that respect rarity-parity, skip inactive users,
    and expose Good-Trader info:

    • user_has_badged        → True se il caller ha già marcato l’utente
    • count_badges_received  → badge totali ricevuti da chiunque

    Ordine finale:
        1) user_has_badged == True        (miei preferiti)
        2) count_badges_received  > 0     (buona reputazione, ord. decresc.)
        3) resto
    """
    username = request.args.get("username", "").strip()
    if not username:
        return jsonify({"message": "Please specify ?username=<value>"}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": f"User '{username}' not found"}), 404
    if user.trade_condition == "NONE":
        return jsonify({
            "message": (
                "Your Trade Status is set on 'Cannot trade'. "
                "Update your Profile settings if you have enough points."
            )
        }), 403

    # ───────────────────────────────────────────────────────────────────
    # 1. pre-carica offerte / ricerche
    # ───────────────────────────────────────────────────────────────────
    from collections import defaultdict
    offers_by_user, wants_by_user = defaultdict(list), defaultdict(list)
    for o in Offer.query:  offers_by_user[o.user_id].append(o)
    for s in Search.query: wants_by_user[s.user_id].append(s)

    COMMON = {"♦", "♦♦", "♦♦♦"}
    def card_key(c): return (c.pokemon, c.expansion, c.rarity)
    def bucket(cards):
        b = defaultdict(set)
        for c in cards:
            b[c.rarity].add(card_key(c))
        return b

    my_offers = offers_by_user[user.id]
    my_wants  = wants_by_user [user.id]
    if user.trade_condition == "COMMON":
        my_offers = [o for o in my_offers if o.rarity in COMMON]

    my_offer_bkt = bucket(my_offers)
    my_want_bkt  = bucket(my_wants)

    # ───────────────────────────────────────────────────────────────────
    # 2. Good-Trader info (una singola query)
    # ───────────────────────────────────────────────────────────────────
    received_cnt = {rid: cnt for rid, cnt in
                    db.session.query(GoodTrader.receiver_id,
                                     func.count(GoodTrader.id))
                               .group_by(GoodTrader.receiver_id)}
    mine_badged = {gt.receiver_id
                   for gt in GoodTrader.query
                                       .filter_by(giver_id=user.id).all()}

    # ───────────────────────────────────────────────────────────────────
    # 3. loop altri utenti
    # ───────────────────────────────────────────────────────────────────
    cutoff = datetime.utcnow() - timedelta(days=7)
    matches = []
    for other in User.query:                         # ORM-cached
        if other.id == user.id:                 continue
        if other.trade_condition == "NONE":     continue
        if not other.login_time or other.login_time < cutoff:  continue

        o_offers = offers_by_user.get(other.id, [])
        o_wants  = wants_by_user .get(other.id, [])
        if not o_offers or not o_wants:         continue
        if other.trade_condition == "COMMON":
            o_offers = [o for o in o_offers if o.rarity in COMMON]

        o_offer_bkt = bucket(o_offers)
        o_want_bkt  = bucket(o_wants)

        give_me, give_them = set(), set()
        for rar in set(my_offer_bkt) | set(o_offer_bkt):
            me_need   = my_want_bkt.get(rar, set())
            other_av  = o_offer_bkt.get(rar, set())
            other_need= o_want_bkt.get(rar, set())
            me_av     = my_offer_bkt.get(rar, set())

            if (match1 := other_av & me_need) and (match2 := me_av & other_need):
                give_me   |= match1
                give_them |= match2

        if not (give_me and give_them):
            continue

        matches.append({
            "other_user"           : other.username,
            "other_user_pokemon_id": other.pokemon_id,
            "other_user_last_login": other.login_time.isoformat(),
            "mySearch_TheirOffer"  : sorted(f"{p} ({e}, {r})" for p,e,r in give_me),
            "theirSearch_MyOffer"  : sorted(f"{p} ({e}, {r})" for p,e,r in give_them),
            "user_has_badged"      : other.id in mine_badged,
            "count_badges_received": received_cnt.get(other.id, 0)
        })

    # ───────────────────────────────────────────────────────────────────
    # 4. ordinamento personalizzato
    # ───────────────────────────────────────────────────────────────────
    def sort_key(m):
        if m["user_has_badged"]:
            return (2, 0)                      # top
        if m["count_badges_received"] > 0:
            return (1, m["count_badges_received"])
        return (0, 0)
    matches.sort(key=sort_key, reverse=True)

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
    """
    Send a Pokéball e-mail that shows:
      · sender Pokémon-Pocket ID
      · cards each side could trade (exact match)
      · sender’s “Preferred Pokémon to receive” (optional)
    """
    data = request.get_json(silent=True) or {}
    from_username = (data.get('from_username')     or '').strip()
    to_username   = (data.get('to_username')       or '').strip()
    preferred_raw = (data.get('preferred_pokemon') or '').strip()

    if not (from_username and to_username):
        return jsonify({'message': 'from_username and to_username required'}), 400

    sender    = User.query.filter_by(username=from_username).first()
    recipient = User.query.filter_by(username=to_username).first()
    if not sender or not recipient or not recipient.email:
        return jsonify({'message': 'Sender or recipient not found'}), 404

    # ------------------------------------------------------------------ #
    #  Collect each side’s offers & wants                                #
    # ------------------------------------------------------------------ #
    s_offers = Offer .query.filter_by(user_id=sender.id)   .all()
    s_wants  = Search.query.filter_by(user_id=sender.id)   .all()
    r_offers = Offer .query.filter_by(user_id=recipient.id).all()
    r_wants  = Search.query.filter_by(user_id=recipient.id).all()

    # ------------------------------------------------------------------ #
    #  Exact matches (same name, expansion, rarity)                      #
    # ------------------------------------------------------------------ #
    def pretty(card):
        return f"{card.pokemon} ({card.expansion}, {card.rarity})"

    give_me   = {pretty(o) for w in s_wants  for o in r_offers if is_same_card(o, w)}
    give_them = {pretty(o) for w in r_wants for o in s_offers if is_same_card(o, w)}

    # ------------------------------------------------------------------ #
    #  Filter “You want from them” by preferred rarity (if any)          #
    # ------------------------------------------------------------------ #
    preferred_rarity = None
    if preferred_raw:
        # estrae la rarità dall’ultima parte fra parentesi: “(..., RARITY)”
        m = re.search(r'\([^,]+,\s*([^)]+)\)', preferred_raw)
        if m:
            preferred_rarity = m.group(1).strip()

    if preferred_rarity:
        give_them = {c for c in give_them if c.endswith(f", {preferred_rarity})")}

    txt_me   = ", ".join(sorted(give_me))   or "–"
    txt_them = ", ".join(sorted(give_them)) or "–"

    # ------------------------------------------------------------------ #
    #  Compose e-mail                                                    #
    # ------------------------------------------------------------------ #
    lines = [
        f"Hi {recipient.username},",
        "",
        f"{sender.username} just sent you a Pokéball!",
        "",
        f"You want from them: {txt_them}",
        "",
    ]
    if preferred_raw:
        lines.append(f"Preferred Pokémon they want from you: {preferred_raw}")
    lines += [
        "",
        f"Open the official Pokémon Pocket app, add {sender.username} "
        f"as a friend (Pokémon ID: {sender.pokemon_id}) and complete the trade.",
        "",
        "When the trade is done, update your Pokémon needs here:",
        "https://pokemontcgptradeplatform.com/",
    ]
    body = "\n".join(lines)

    # ------------------------------------------------------------------ #
    #  Send with automatic retries                                       #
    # ------------------------------------------------------------------ #
    subject = "You received a Pokéball!"
    ok = send_mail_with_retry(recipient.email, subject, body,
                              max_attempts=3, delay_sec=2)

    if ok:
        return jsonify({'message': 'Pokéball sent via email!'}), 200
    else:
        return jsonify({'message': 'Permanent email delivery failure.'}), 500

    
@routes_bp.route("/pokemon/offer_count", methods=["GET"])
def offer_count():
    """
    Ritorna il numero di *utenti* con login_time valorizzato
    che stanno offrendo quel Pokémon.  Se vengono passati
    expansion e/o rarity restringe il conteggio.
    """
    name      = request.args.get("pokemon",   "").strip()
    expansion = request.args.get("expansion", "").strip()
    rarity    = request.args.get("rarity",    "").strip()

    if not name:
        return jsonify({"message": "pokemon is required"}), 400

    active_cutoff = datetime.utcnow() - timedelta(days=7)
    
    q = (
        db.session.query(Offer.user_id)
        .join(User, User.id == Offer.user_id)
        .filter(User.login_time.isnot(None),      # filtra utenti “attivi”
                User.login_time > active_cutoff,   # ultimo login >7 gg fa → skip
                Offer.pokemon == name)
    )
    if expansion:
        q = q.filter(Offer.expansion == expansion)
    if rarity:
        q = q.filter(Offer.rarity == rarity)

    count = q.distinct().count()
    return jsonify({"count": count})

#  --- Good-Trader : add / remove ------------------------------------
@routes_bp.route('/user/badge', methods=['POST'])
def add_badge():
    data      = request.get_json() or {}
    giver     = User.query.filter_by(username=data.get('from_username')).first()
    receiver  = User.query.filter_by(username=data.get('target_username')).first()
    if not (giver and receiver):
        return jsonify({"message": "invalid users"}), 404
    if GoodTrader.query.filter_by(giver_id=giver.id, receiver_id=receiver.id).first():
        return jsonify({"message": "already present"}), 200
    db.session.add(GoodTrader(giver_id=giver.id, receiver_id=receiver.id))
    db.session.commit()
    return jsonify({"message": "badge added"}), 200

@routes_bp.route('/user/badge/remove', methods=['POST'])
def remove_badge():
    data      = request.get_json() or {}
    giver     = User.query.filter_by(username=data.get('from_username')).first()
    receiver  = User.query.filter_by(username=data.get('target_username')).first()
    row = GoodTrader.query.filter_by(giver_id=giver.id, receiver_id=receiver.id).first()
    if not row:
        return jsonify({"message": "nothing to remove"}), 404
    db.session.delete(row); db.session.commit()
    return jsonify({"message": "badge removed"}), 200