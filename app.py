from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# Store users with their session IDs
users = {}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('join')
def handle_join(username):
    session_id = request.sid
    users[session_id] = username
    join_room('chat')
    
    # Send updated user list to all clients
    user_list = list(users.values())
    emit('user_update', user_list, broadcast=True)
    
    # Send join message
    emit('message', {
        'user': 'System',
        'text': f'{username} has joined the chat.',
        'time': datetime.now().strftime('%H:%M:%S')
    }, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    session_id = request.sid
    if session_id in users:
        username = users[session_id]
        del users[session_id]
        
        # Send updated user list to all remaining clients
        user_list = list(users.values())
        emit('user_update', user_list, broadcast=True)
        
        # Send leave message
        emit('message', {
            'user': 'System',
            'text': f'{username} has left the chat.',
            'time': datetime.now().strftime('%H:%M:%S')
        }, broadcast=True)

@socketio.on('message')
def handle_message(data):
    session_id = request.sid
    if session_id in users:
        message = {
            'user': data['user'],
            'text': data['text'],
            'time': datetime.now().strftime('%H:%M:%S')
        }
        emit('message', message, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
