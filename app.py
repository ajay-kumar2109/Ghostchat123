# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, jsonify
from datetime import datetime
import secrets
import base64

app = Flask(__name__)

# Configure maximum file sizes
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_VIDEO_SIZE = 10 * 1024 * 1024  # 10MB

# Store messages in memory
messages = []
users = {}

def generate_user_id():
    return secrets.token_hex(4)

def validate_file_size(content, file_type):
    # Remove data URL prefix to get base64 content
    base64_content = content.split(',')[1]
    file_size = len(base64.b64decode(base64_content))
    
    if file_type == 'image' and file_size > MAX_IMAGE_SIZE:
        return False
    if file_type == 'video' and file_size > MAX_VIDEO_SIZE:
        return False
    return True

@app.route('/')
def index():
    user_id = request.remote_addr
    if user_id not in users:
        users[user_id] = generate_user_id()
    return render_template('index.html', user_id=users[user_id])

@app.route('/api/messages', methods=['GET'])
def get_messages():
    return jsonify(list(messages))

@app.route('/api/messages', methods=['POST'])
def post_message():
    data = request.json
    user_id = request.remote_addr
    
    if user_id not in users:
        users[user_id] = generate_user_id()
    
    message_type = data.get('type', 'text')
    content = data['content']
    
    # Validate file sizes
    if message_type in ['image', 'video']:
        if not validate_file_size(content, message_type):
            return jsonify({
                "status": "error",
                "message": f"File too large. Maximum size for {message_type}s is " +
                          f"{MAX_IMAGE_SIZE if message_type == 'image' else MAX_VIDEO_SIZE} bytes"
            }), 400
    
    message = {
        'id': len(messages),
        'user_id': users[user_id],
        'content': content,
        'type': message_type,
        'timestamp': datetime.now().isoformat()
    }
    
    messages.append(message)
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)