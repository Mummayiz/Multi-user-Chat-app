from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

users = set()

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('join')
def handle_join(username):
    users.add(username)
    join_room('chat')
    emit('user_update', list(users), broadcast=True)
    emit('message', {
        'user': 'System',
        'text': f'{username} has joined the chat.',
        'time': datetime.now().strftime('%H:%M:%S')
    }, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    # No username provided by disconnect event by default; workaround via sessions
    # This simplified version assumes only one user per tab/session
    for username in list(users):
        users.remove(username)
        emit('user_update', list(users), broadcast=True)
        emit('message', {
            'user': 'System',
            'text': f'{username} has left the chat.',
            'time': datetime.now().strftime('%H:%M:%S')
        }, broadcast=True)
        break  # Prevents multiple emits per disconnect

@socketio.on('message')
def handle_message(data):
    message = {
        'user': data['user'],
        'text': data['text'],
        'time': datetime.now().strftime('%H:%M:%S')
    }
    emit('message', message, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)
