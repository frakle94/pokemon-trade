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
    old_db_path = os.path.join(script_dir, "database.db")
    new_db_path = os.path.join(script_dir, "database_new.db")

    if os.path.exists(new_db_path):
        print(f"ATTENZIONE: il file {new_db_path} esiste già e verrà sovrascritto!")
        os.remove(new_db_path)

    engine_new = sqlalchemy.create_engine(f"sqlite:///{new_db_path}", echo=False)
    Base.metadata.create_all(engine_new)
    SessionNew = sessionmaker(bind=engine_new)
    session_new = SessionNew()

    print(f"Creato il nuovo database: {new_db_path} con la colonna trade_condition in 'user'.")

    conn_old = sqlite3.connect(old_db_path)
    cursor_old = conn_old.cursor()

    # Copia la tabella user
    rows_users = cursor_old.execute("SELECT id, username, email, password, pokemon_id FROM user").fetchall()
    for r in rows_users:
        new_user = User(
            id=r[0],
            username=r[1],
            email=r[2],
            password=r[3],
            pokemon_id=r[4],
            trade_condition="ALL"  # Valore di default
        )
        session_new.add(new_user)
    session_new.commit()
    print(f"Copiati {len(rows_users)} utenti nella nuova tabella 'user'.")

    # Copia la tabella offer
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

    # Copia la tabella search
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

    conn_old.close()
    session_new.close()

    print("\nBackup completato. Il nuovo database contiene la colonna 'trade_condition' in 'user'.")

if __name__ == "__main__":
    main()
