#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import shutil
from datetime import datetime, timedelta

def main():
    # The main database file you want to back up
    src = "database.db"
    
    # Today's date in DDMMYYYY format
    today_str = datetime.now().strftime("%d%m%Y")
    # Yesterday's date in DDMMYYYY format
    yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%d%m%Y")
    
    # The new backup file name for today
    backup_filename = f"database_{today_str}.db"
    # The old backup file name from yesterday
    old_backup_filename = f"database_{yesterday_str}.db"
    
    # If yesterday's backup exists, remove it
    if os.path.exists(old_backup_filename):
        os.remove(old_backup_filename)
        print(f"Deleted old backup '{old_backup_filename}'.")
    
    # Copy today's database
    shutil.copy(src, backup_filename)
    print(f"Copied '{src}' to '{backup_filename}'.")

if __name__ == "__main__":
    main()