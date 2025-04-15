#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import shutil
from datetime import datetime, timedelta

def main():
    src = "/home/CescoT/mysite/Trade_Pokemon/pokemon-trade/database.db"

    today_str = datetime.now().strftime("%d%m%Y")
    yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%d%m%Y")

    # Use the same directory as src for the backups
    backup_filename = f"/home/CescoT/mysite/Trade_Pokemon/pokemon-trade/database_{today_str}.db"
    old_backup_filename = f"/home/CescoT/mysite/Trade_Pokemon/pokemon-trade/database_{yesterday_str}.db"

    if os.path.exists(old_backup_filename):
        os.remove(old_backup_filename)
        print(f"Deleted old backup '{old_backup_filename}'.")

    shutil.copy(src, backup_filename)
    print(f"Copied '{src}' to '{backup_filename}'.")

if __name__ == "__main__":
    main()