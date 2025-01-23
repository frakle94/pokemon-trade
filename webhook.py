import os
from flask import Flask, request

app = Flask(__name__)

@app.route('/hooks/github', methods=['POST'])
def github_webhook():
    # Pull the latest changes from GitHub
    os.system("cd /home/cescot/mysite/Trade_Pokemon && git pull origin main")
    os.system("touch /var/www/cescot_pythonanywhere_com_wsgi.py")  # Reload the web app
    return "Webhook received and processed.", 200