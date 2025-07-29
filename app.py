import os
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, send, join_room, leave_room
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# Track connected users
users = set()

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('join')
def handle_join(username):
    users.add(username)
    join_room("chatroom")
    timestamp = datetime.now().strftime('%H:%M:%S')
    emit('message', {
        'msg': f"{username} joined the chat!",
        'username': 'System',
        'timestamp': timestamp
    }, room="chatroom")

@socketio.on('message')
def handle_message(data):
    username = data['username']
    msg = data['msg']
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"📨 Message from {username} at {timestamp}: {msg}")
    emit('message', {
        'msg': msg,
        'username': username,
        'timestamp': timestamp
    }, room="chatroom")

@socketio.on('disconnect')
def handle_disconnect():
    for user in list(users):
        users.remove(user)
        timestamp = datetime.now().strftime('%H:%M:%S')
        emit('message', {
            'msg': f"{user} has left the chat.",
            'username': 'System',
            'timestamp': timestamp
        }, room="chatroom")

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))
