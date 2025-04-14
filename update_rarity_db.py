#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sqlite3
import os

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, "database.db")

    # Mappa vecchie rarità -> nuove rarità (rombi/stelle)
    # Se un valore non è in questa mappa, resta invariato.
    # Nota: In SQLite puoi farlo con un singolo UPDATE utilizzando CASE WHEN
    #       ma qui mostriamo la versione Python più esplicita (e flessibile).
    rarita_map = {
        'C':  '♦',
        'U':  '♦♦',
        'R':  '♦♦♦',
        'RR': '♦♦♦♦',
        'AR': '★'
    }

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Per ogni tabella che contiene la colonna `rarity`, eseguiamo un update
    for table_name in ['offer', 'search']:
        # Recupera tutte le righe di `table_name` con le colonne id e rarity
        cursor.execute(f"SELECT id, rarity FROM {table_name}")
        rows = cursor.fetchall()

        for row in rows:
            record_id, old_rarity = row
            if old_rarity in rarita_map:
                new_rarity = rarita_map[old_rarity]
                # Aggiorna la riga con il nuovo valore
                cursor.execute(f"UPDATE {table_name} SET rarity = ? WHERE id = ?", (new_rarity, record_id))

        # Stampa quante righe abbiamo gestito (non necessariamente tutte cambiate)
        print(f"Aggiornata la colonna rarity nella tabella {table_name} ({len(rows)} record letti).")

    # Conferma le modifiche
    conn.commit()
    cursor.close()
    conn.close()

    print("Aggiornamento completato! Le rarità sono state convertite nel database esistente.")

if __name__ == "__main__":
    main()