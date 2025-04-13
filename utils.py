# utils.py

import os
import requests
import csv
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from itsdangerous import URLSafeTimedSerializer

load_dotenv()  # Se non lo carichi altrove

# Tua costante base per l'URL delle immagini
BASE_URL = "https://assets.pokemon-zone.com/game-assets/CardPreviews"

def send_mail_with_mailjet(to_email, subject, text_body):
    """
    Invia un'email usando l'API di Mailjet.
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

def is_same_card(offer_or_search_obj, want_obj):
    """
    Verifica se due carte sono le stesse, confrontando nome Pokémon, espansione e rarità.
    """
    return (
        offer_or_search_obj.pokemon == want_obj.pokemon and
        offer_or_search_obj.expansion == want_obj.expansion and
        offer_or_search_obj.rarity == want_obj.rarity
    )

def get_image_for_pokemon(pokemon_name, expansion_name, rarity_name):
    """
    Restituisce il nome file (o path) dell'immagine associata a uno specifico Pokémon
    in base a nome, espansione e rarità, leggendo dal file CSV di anagrafica.
    """
    csv_path = os.path.join(os.path.dirname(__file__), 'static', 'files', 'Anagrafica_Pokemon.csv')
    name_lower = pokemon_name.strip().lower()
    expansion_lower = expansion_name.strip().lower()
    rarity_lower = rarity_name.strip().lower()
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.reader(file, delimiter=';')
            next(csv_reader, None)  # Salta l’intestazione
            for row in csv_reader:
                if len(row) < 4:
                    continue
                csv_expansion = row[0].strip().lower()
                csv_name = row[1].strip().lower()
                csv_rarity = row[2].strip().lower()
                csv_image = row[3].strip()
                if csv_expansion == expansion_lower and csv_name == name_lower and csv_rarity == rarity_lower:
                    return csv_image
    except FileNotFoundError:
        print("CSV file not found in get_image_for_pokemon.")
    except Exception as e:
        print("Error in get_image_for_pokemon:", e)
    return ""

def get_rarity_for_pokemon(pokemon_name):
    """
    Restituisce la rarità di default per un Pokémon leggendo dal CSV di anagrafica.
    """
    csv_path = os.path.join(os.path.dirname(__file__), 'static', 'files', 'Anagrafica_Pokemon.csv')
    name_lower = pokemon_name.strip().lower()
    try:
        with open(csv_path, 'r') as file:
            csv_reader = csv.reader(file, delimiter=';')
            next(csv_reader, None)
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
    """
    Restituisce l'espansione di default per un Pokémon leggendo dal CSV di anagrafica.
    """
    csv_path = os.path.join(os.path.dirname(__file__), 'static', 'files', 'Anagrafica_Pokemon.csv')
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