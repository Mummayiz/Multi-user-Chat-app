const socket = io();
let username = prompt("Enter your name:");
if (!username) username = "Anonymous";
socket.emit("join", username);

const userList = document.getElementById("user-list");
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");

sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const message = messageInput.value.trim();
  if (message !== "") {
    socket.emit("send_message", { message });
    messageInput.value = "";
  }
}

socket.on("chat_message", (data) => {
  const msg = document.createElement("div");
  msg.classList.add("message");
  msg.innerHTML = `<strong>${data.user}</strong> <span class="time">[${data.timestamp}]</span>: ${data.message}`;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on("user_list", (users) => {
  userList.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user;
    userList.appendChild(li);
  });
});
