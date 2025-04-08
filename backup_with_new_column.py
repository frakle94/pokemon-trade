#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sqlite3
import sqlalchemy
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = 'user'
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password = Column(String(200), nullable=False)
    pokemon_id = Column(String(50), nullable=False)
    trade_condition = Column(String(20), nullable=False, default="NONE")

class Offer(Base):
    __tablename__ = 'offer'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    pokemon = Column(String(80), nullable=False)
    expansion = Column(String(80), nullable=True)
    rarity = Column(String(80), nullable=True)

class Search(Base):
    __tablename__ = 'search'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    pokemon = Column(String(80), nullable=False)
    expansion = Column(String(80), nullable=True)
    rarity = Column(String(80), nullable=True)

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # The script reads from "database.db"
    old_db_path = os.path.join(script_dir, "database.db")
    # We'll create an updated copy called "database_new.db"
    new_db_path = os.path.join(script_dir, "database_new.db")
    # Eventually, we'll rename old_db_path to "database_old.db"
    old_db_backup = os.path.join(script_dir, "database_old.db")

    # If "database_new.db" exists, remove it
    if os.path.exists(new_db_path):
        print(f"ATTENZIONE: Il file {new_db_path} esiste già e verrà sovrascritto!")
        os.remove(new_db_path)

    # Create the new DB with updated structure
    engine_new = sqlalchemy.create_engine(f"sqlite:///{new_db_path}", echo=False)
    Base.metadata.create_all(engine_new)
    SessionNew = sessionmaker(bind=engine_new)
    session_new = SessionNew()

    print(f"Creato il nuovo database temporaneo: {new_db_path} con la colonna trade_condition in 'user'.")

    # Connect to the old DB (still named 'database.db')
    conn_old = sqlite3.connect(old_db_path)
    cursor_old = conn_old.cursor()

    # Copy the table user
    rows_users = cursor_old.execute("SELECT id, username, email, password, pokemon_id FROM user").fetchall()
    for r in rows_users:
        new_user = User(
            id=r[0],
            username=r[1],
            email=r[2],
            password=r[3],
            pokemon_id=r[4],
            trade_condition="ALL"  # default for all users in the new DB
        )
        session_new.add(new_user)
    session_new.commit()
    print(f"Copiati {len(rows_users)} utenti nella nuova tabella 'user'.")

    # Copy the table offer
    rows_offers = cursor_old.execute("SELECT id, user_id, pokemon, expansion, rarity FROM offer").fetchall()
    for r in rows_offers:
        new_offer = Offer(
            id=r[0],
            user_id=r[1],
            pokemon=r[2],
            expansion=r[3],
            rarity=r[4]
        )
        session_new.add(new_offer)
    session_new.commit()
    print(f"Copiate {len(rows_offers)} offerte nella nuova tabella 'offer'.")

    # Copy the table search
    rows_search = cursor_old.execute("SELECT id, user_id, pokemon, expansion, rarity FROM search").fetchall()
    for r in rows_search:
        new_search = Search(
            id=r[0],
            user_id=r[1],
            pokemon=r[2],
            expansion=r[3],
            rarity=r[4]
        )
        session_new.add(new_search)
    session_new.commit()
    print(f"Copiati {len(rows_search)} record nella nuova tabella 'search'.")

    # Close old DB and new session
    conn_old.close()
    session_new.close()

    # Now rename the old "database.db" to "database_old.db" 
    # and rename "database_new.db" to "database.db"
    if os.path.exists(old_db_backup):
        print(f"ATTENZIONE: Il file {old_db_backup} esiste già e verrà sovrascritto!")
        os.remove(old_db_backup)

    print(f"Rinominazione: {old_db_path} --> {old_db_backup}")
    os.rename(old_db_path, old_db_backup)

    print(f"Rinominazione: {new_db_path} --> {old_db_path}")
    os.rename(new_db_path, old_db_path)

    print("\nBackup completato:")
    print(f" - Il vecchio database è ora: {old_db_backup}")
    print(f" - Il nuovo database è ora: {old_db_path}")
    print("Tutti gli utenti hanno trade_condition='ALL' nel nuovo DB.")

if __name__ == "__main__":
    main()
