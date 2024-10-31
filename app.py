# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from datetime import datetime
import secrets

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(16)
socketio = SocketIO(app, cors_allowed_origins="*")

# Store messages in memory with a maximum limit
MAX_MESSAGES = 100
messages = []
users = {}

def generate_user_id():
    return secrets.token_hex(4)

@app.route('/')
def index():
    user_id = request.remote_addr
    if user_id not in users:
        users[user_id] = generate_user_id()
    return render_template('index.html', user_id=users[user_id])

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('message_history', messages)

@socketio.on('message')
def handle_message(data):
    user_id = request.remote_addr
    if user_id not in users:
        users[user_id] = generate_user_id()
    
    message = {
        'id': len(messages),
        'user_id': users[user_id],
        'content': data['content'],
        'type': data.get('type', 'text'),
        'timestamp': datetime.now().isoformat()
    }
    
    messages.append(message)
    if len(messages) > MAX_MESSAGES:
        messages.pop(0)
    
    print(f"New message from {users[user_id]}: {data['content']}")
    emit('new_message', message, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)