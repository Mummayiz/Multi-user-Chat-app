const socket = io();
let username = prompt("Enter your username");
socket.emit('join', { username });

window.addEventListener('beforeunload', () => {
    socket.emit('disconnect_user', { username });
});

const messageForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message');
const messageBox = document.getElementById('messages');
const userList = document.getElementById('users');

socket.on('chat_message', data => {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    if (data.system) msgDiv.classList.add('system');

    msgDiv.innerHTML = `<span class="timestamp">[${data.timestamp}]</span> ${data.msg}`;
    messageBox.appendChild(msgDiv);
    messageBox.scrollTop = messageBox.scrollHeight;
});

socket.on('user_list', users => {
    userList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        userList.appendChild(li);
    });
});

messageForm.addEventListener('submit', e => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if (msg) {
        socket.emit('send_message', { username, msg });
        messageInput.value = '';
    }
});
