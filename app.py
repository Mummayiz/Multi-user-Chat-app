from flask import Flask, render_template, request, send_from_directory, jsonify, session, redirect, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room
from datetime import datetime
import pytz
import socket
import os
import sqlite3
import hashlib
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Set your timezone here - change this to your local timezone
TIMEZONE = pytz.timezone('Asia/Kolkata')  # Change this to your timezone

# Create uploads directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

socketio = SocketIO(app, cors_allowed_origins="*")

# Store users with their session IDs
users = {}  # session_id: username
authenticated_users = {}  # session_id: user_data

def find_free_port(start_port=5000, max_port=5100):
    """Find a free port starting from start_port"""
    for port in range(start_port, max_port):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            continue
    return None

def get_current_time():
    """Get current time in the specified timezone"""
    utc_now = datetime.utcnow()
    utc_now = pytz.utc.localize(utc_now)
    local_time = utc_now.astimezone(TIMEZONE)
    return local_time.strftime('%H:%M:%S')

def get_current_timestamp():
    """Get current timestamp for database"""
    utc_now = datetime.utcnow()
    utc_now = pytz.utc.localize(utc_now)
    local_time = utc_now.astimezone(TIMEZONE)
    return local_time

# Initialize database
def init_db():
    conn = sqlite3.connect('chat.db')
    c = conn.cursor()
    
    # Users table
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  password_hash TEXT NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # Chat messages table (for future chat history feature)
    c.execute('''CREATE TABLE IF NOT EXISTS messages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT NOT NULL,
                  message TEXT NOT NULL,
                  message_type TEXT DEFAULT 'text',
                  filename TEXT,
                  original_name TEXT,
                  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    conn.commit()
    conn.close()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, password_hash):
    return hashlib.sha256(password.encode()).hexdigest() == password_hash

def get_user(username):
    conn = sqlite3.connect('chat.db')
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = c.fetchone()
    conn.close()
    return user

def create_user(username, password):
    conn = sqlite3.connect('chat.db')
    c = conn.cursor()
    try:
        password_hash = hash_password(password)
        c.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", 
                  (username, password_hash))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    user = get_user(username)
    if user and verify_password(password, user[2]):  # user[2] is password_hash
        session['user_id'] = user[0]
        session['username'] = user[1]
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters long'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400
    
    if create_user(username, password):
        # Auto-login after registration
        user = get_user(username)
        session['user_id'] = user[0]
        session['username'] = user[1]
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'Username already exists'}), 409

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    if 'file' not in request.files:
        return {'error': 'No file selected'}, 400
    
    file = request.files['file']
    if file.filename == '':
        return {'error': 'No file selected'}, 400
    
    if file:
        filename = secure_filename(file.filename)
        # Add timestamp to avoid filename conflicts
        current_time = get_current_timestamp()
        timestamp = current_time.strftime('%Y%m%d_%H%M%S_')
        filename = timestamp + filename
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        return {'filename': filename, 'original_name': file.filename}

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@socketio.on('join')
def handle_join():
    if 'user_id' not in session:
        emit('auth_required')
        return
    
    session_id = request.sid
    username = session['username']
    
    users[session_id] = username
    authenticated_users[session_id] = {
        'user_id': session['user_id'],
        'username': username
    }
    
    join_room('chat')
    
    # Send updated user list to all clients
    user_list = list(users.values())
    emit('user_update', user_list, broadcast=True)
    
    # Send join message with correct time
    emit('message', {
        'user': 'System',
        'text': f'{username} has joined the chat.',
        'time': get_current_time()
    }, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    session_id = request.sid
    if session_id in users:
        username = users[session_id]
        del users[session_id]
        if session_id in authenticated_users:
            del authenticated_users[session_id]
        
        # Send updated user list to all remaining clients
        user_list = list(users.values())
        emit('user_update', user_list, broadcast=True)
        
        # Send leave message with correct time
        emit('message', {
            'user': 'System',
            'text': f'{username} has left the chat.',
            'time': get_current_time()
        }, broadcast=True)

@socketio.on('message')
def handle_message(data):
    session_id = request.sid
    if session_id in authenticated_users:
        username = authenticated_users[session_id]['username']
        message = {
            'user': username,
            'text': data['text'],
            'time': get_current_time()
        }
        emit('message', message, broadcast=True)

@socketio.on('file_message')
def handle_file_message(data):
    session_id = request.sid
    if session_id in authenticated_users:
        username = authenticated_users[session_id]['username']
        message = {
            'user': username,
            'text': data['text'],
            'filename': data['filename'],
            'original_name': data['original_name'],
            'type': 'file',
            'time': get_current_time()
        }
        emit('message', message, broadcast=True)

if __name__ == '__main__':
    init_db()
    
    # Try to find a free port
    port = find_free_port(5000, 5010)
    if port is None:
        print("❌ No free ports available between 5000-5010")
        print("💡 Try closing other applications or restart your computer")
        exit(1)
    
    print(f"🚀 Starting chat app on http://localhost:{port}")
    print(f"🌟 Access your app at: http://127.0.0.1:{port}")
    
    try:
        socketio.run(app, debug=True, host='127.0.0.1', port=port)
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        print("💡 Try running: taskkill /f /im python.exe")
