# utils.py

import os
import requests
import csv
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from itsdangerous import URLSafeTimedSerializer
import smtplib
from email.message import EmailMessage
import time
import logging

load_dotenv()

# Tua costante base per l'URL delle immagini
BASE_URL = "https://assets.pokemon-zone.com/game-assets/CardPreviews"

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

# -----------------------------------------------------------------------------
#  NEW UTILITY: send_mail (Gmail SMTP)
# -----------------------------------------------------------------------------

def send_mail(to_addr: str, subject: str, body: str):
    import smtplib, ssl
    from email.message import EmailMessage
    from os import getenv

    GMAIL_USER = getenv("GMAIL_USER")
    GMAIL_PWD  = getenv("GMAIL_PWD")
    if not (GMAIL_USER and GMAIL_PWD):
        raise RuntimeError("Set GMAIL_USER and GMAIL_PWD!")

    msg = EmailMessage()
    msg["From"] = GMAIL_USER
    msg["To"]   = to_addr
    msg["Subject"] = subject
    msg.set_content(body)

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as smtp:
            smtp.starttls(context=context)
            smtp.login(GMAIL_USER, GMAIL_PWD)
            smtp.send_message(msg)
    except smtplib.SMTPException as exc:
        # log oppure fallback/alert amministratore
        print("Gmail SMTP failed:", exc)
        raise

def send_mail_with_retry(to_addr: str, subject: str, body: str,
                         max_attempts: int = 3, delay_sec: int = 2) -> bool:
    """
    Invio G-Mail con fino a `max_attempts` tentativi.
    Ritorna True se almeno un tentativo va a buon fine, False altrimenti.
    """
    for attempt in range(1, max_attempts + 1):
        try:
            send_mail(to_addr, subject, body)
            return True
        except Exception as exc:
            logging.warning(
                "Email attempt %s/%s to %s failed: %s",
                attempt, max_attempts, to_addr, exc
            )
            if attempt < max_attempts:
                time.sleep(delay_sec)
    return False
