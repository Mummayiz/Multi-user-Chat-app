// Professional ChatFlow JavaScript
class ChatApp {
  constructor() {
    this.socket = io();
    this.username = null;
    this.currentUser = null;
    this.isTyping = false;
    this.typingTimer = null;
    this.lastActivity = Date.now();
    
    this.initElements();
    this.initEventListeners();
    this.initEmojiPicker();
    this.initSocket();
    this.startActivityMonitor();
  }

  // Initialize DOM elements
  initElements() {
    this.elements = {
      // Connection status
      statusDot: document.getElementById('status-dot'),
      connectionText: document.getElementById('connection-text'),
      
      // User info
      currentUserName: document.getElementById('current-user-name'),
      userAvatar: document.getElementById('user-avatar'),
      onlineCount: document.getElementById('online-count'),
      userList: document.getElementById('user-list'),
      
      // Chat elements
      messages: document.getElementById('messages'),
      messageInput: document.getElementById('message-input'),
      sendBtn: document.getElementById('send-button'),
      
      // Actions
      fileInput: document.getElementById('file-upload'),
      fileBtn: document.getElementById('file-btn'),
      emojiBtn: document.getElementById('emoji-btn'),
      emojiPicker: document.getElementById('emoji-picker'),
      emojiGrid: document.getElementById('emoji-grid'),
      
      // Mobile
      sidebar: document.getElementById('sidebar'),
      mobileMenuBtn: document.querySelector('.mobile-menu-btn')
    };
  }

  // Initialize event listeners
  initEventListeners() {
    // Message input events
    this.elements.messageInput.addEventListener('input', () => {
      this.handleTyping();
      this.autoResize();
      this.updateSendButton();
    });

    this.elements.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button
    this.elements.sendBtn.addEventListener('click', () => this.sendMessage());

    // File upload
    this.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    this.elements.fileBtn.addEventListener('click', () => this.elements.fileInput.click());

    // Emoji picker
    this.elements.emojiBtn.addEventListener('click', () => this.toggleEmojiPicker());

    // Mobile menu
    if (this.elements.mobileMenuBtn) {
      this.elements.mobileMenuBtn.addEventListener('click', () => this.toggleSidebar());
    }

    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.elements.emojiPicker.contains(e.target) && 
          e.target !== this.elements.emojiBtn) {
        this.hideEmojiPicker();
      }
      
      // Close sidebar on mobile when clicking outside
      if (window.innerWidth <= 768 && 
          !this.elements.sidebar.contains(e.target) && 
          !e.target.classList.contains('mobile-menu-btn')) {
        this.closeSidebar();
      }
    });

    // Window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.closeSidebar();
      }
    });

    // Page visibility
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateLastActivity();
      }
    });

    // Mouse and keyboard activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => this.updateLastActivity(), { passive: true });
    });
  }

  // Initialize emoji picker
  initEmojiPicker() {
    const emojis = [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
      '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '😘',
      '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
      '🤨', '🧐', '🤓', '😎', '🤩', '😏', '😒', '😞',
      '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫',
      '😩', '😤', '😠', '😡', '🤬', '🤯', '😳', '😱',
      '😨', '😰', '😥', '😢', '😭', '😪', '😴', '🤤',
      '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
      '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️',
      '🖖', '👋', '🤝', '🙏', '✍️', '💪', '🦵', '🦶',
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
      '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️',
      '🔥', '⭐', '🌟', '✨', '⚡', '🌈', '🎉', '🎊',
      '🎈', '🎁', '🎂', '🎄', '🎃', '👻', '🎭', '🏆'
    ];

    this.elements.emojiGrid.innerHTML = '';
    emojis.forEach(emoji => {
      const emojiElement = document.createElement('div');
      emojiElement.className = 'emoji';
      emojiElement.textContent = emoji;
      emojiElement.onclick = () => this.insertEmoji(emoji);
      this.elements.emojiGrid.appendChild(emojiElement);
    });
  }

  // Initialize socket events
  initSocket() {
    this.socket.on('connect', () => {
      this.updateConnectionStatus(true);
      this.socket.emit('join');
    });

    this.socket.on('disconnect', () => {
      this.updateConnectionStatus(false);
    });

    this.socket.on('connect_error', (error) => {
      this.updateConnectionStatus(false, 'Connection Error');
      console.error('Connection error:', error);
    });

    this.socket.on('auth_required', () => {
      this.showNotification('Authentication required. Redirecting to login...', 'error');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    });

    this.socket.on('user_update', (users) => {
      this.updateUserList(users);
    });

    this.socket.on('message', (data) => {
      this.displayMessage(data);
    });

    this.socket.on('user_typing', (data) => {
      this.showTypingIndicator(data.username);
    });

    this.socket.on('user_stopped_typing', (data) => {
      this.hideTypingIndicator(data.username);
    });
  }

  // Update connection status
  updateConnectionStatus(connected, customText = null) {
    if (connected) {
      this.elements.statusDot.classList.remove('disconnected');
      this.elements.connectionText.textContent = customText || 'Connected';
    } else {
      this.elements.statusDot.classList.add('disconnected');
      this.elements.connectionText.textContent = customText || 'Disconnected';
    }
    this.updateSendButton();
  }

  // Update user list
  updateUserList(users) {
    this.elements.userList.innerHTML = '';
    this.elements.onlineCount.textContent = `${users.length} user${users.length !== 1 ? 's' : ''} online`;
    
    users.forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      
      if (user === this.currentUser) {
        userItem.classList.add('current-user');
        this.elements.currentUserName.textContent = user;
        this.elements.userAvatar.textContent = this.getInitials(user);
      }
      
      const initials = this.getInitials(user);
      userItem.innerHTML = `
        <div class="user-item-avatar">${initials}</div>
        <div class="user-item-info">
          <div class="user-item-name">${this.escapeHtml(user)}</div>
          <div class="user-item-status">Online</div>
        </div>
      `;
      
      this.elements.userList.appendChild(userItem);
    });
  }

  // Display message
  displayMessage(data) {
    const isSystem = data.user === 'System';
    const isOwn = data.user === this.currentUser;
    
    if (!this.currentUser && !isSystem) {
      this.currentUser = data.user;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSystem ? 'system' : ''} ${isOwn ? 'own' : ''}`;
    
    if (isSystem) {
      messageDiv.innerHTML = `
        <div class="message-content">
          <div class="message-text">${this.escapeHtml(data.text)}</div>
        </div>
      `;
    } else if (data.type === 'file') {
      const fileExtension = data.original_name.split('.').pop().toLowerCase();
      const fileIcon = this.getFileIcon(fileExtension);
      
      messageDiv.innerHTML = `
        <div class="message-container">
          <div class="message-avatar">${this.getInitials(data.user)}</div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-author">${this.escapeHtml(data.user)}</span>
              <span class="message-time">${this.formatTime(data.time)}</span>
            </div>
            <div class="file-message" onclick="window.open('/uploads/${data.filename}', '_blank')">
              <div class="file-info">
                <div class="file-icon">${fileIcon}</div>
                <div class="file-details">
                  <div class="file-name">${this.escapeHtml(data.original_name)}</div>
                  <div class="file-size">Click to download</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="message-container">
          <div class="message-avatar">${this.getInitials(data.user)}</div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-author">${this.escapeHtml(data.user)}</span>
              <span class="message-time">${this.formatTime(data.time)}</span>
            </div>
            <div class="message-text">${this.processMessageText(data.text)}</div>
          </div>
        </div>
      `;
    }
    
    this.elements.messages.appendChild(messageDiv);
    this.scrollToBottom();
    
    // Add notification for new messages when tab is not visible
    if (document.hidden && !isOwn && !isSystem) {
      this.showDesktopNotification(data.user, data.text);
    }
  }

  // Process message text (URLs, mentions, etc.)
  processMessageText(text) {
    let processedText = this.escapeHtml(text);
    
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    processedText = processedText.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Convert line breaks
    processedText = processedText.replace(/\n/g, '<br>');
    
    return processedText;
  }

  // Send message
  sendMessage() {
    const text = this.elements.messageInput.value.trim();
    if (text !== '' && this.socket.connected) {
      this.socket.emit('message', { text });
      this.elements.messageInput.value = '';
      this.autoResize();
      this.updateSendButton();
      this.stopTyping();
    }
  }

  // Handle typing indicator
  handleTyping() {
    if (!this.isTyping) {
      this.isTyping = true;
      this.socket.emit('typing');
    }
    
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.stopTyping();
    }, 1000);
  }

  stopTyping() {
    if (this.isTyping) {
      this.isTyping = false;
      this.socket.emit('stop_typing');
    }
    clearTimeout(this.typingTimer);
  }

  showTypingIndicator(username) {
    // Implementation for showing typing indicator
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.style.display = 'flex';
      indicator.querySelector('#typing-text').textContent = `${username} is typing...`;
    }
  }

  hideTypingIndicator(username) {
    // Implementation for hiding typing indicator
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  // Handle file upload
  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      this.showNotification('File size must be less than 16MB', 'error');
      event.target.value = '';
      return;
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4', 'audio/mpeg'
    ];

    if (!allowedTypes.includes(file.type)) {
      this.showNotification('File type not supported', 'error');
      event.target.value = '';
      return;
    }

    this.showUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        this.socket.emit('file_message', {
          text: `Shared a file: ${result.original_name}`,
          filename: result.filename,
          original_name: result.original_name
        });
        this.hideUploadProgress();
        this.showNotification('File uploaded successfully', 'success');
      } else {
        const error = await response.json();
        this.showNotification(error.error || 'File upload failed', 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      this.showNotification('File upload failed. Please check your connection.', 'error');
    } finally {
      this.hideUploadProgress();
      event.target.value = '';
    }
  }

  // Show upload progress
  showUploadProgress(percent) {
    // Implementation for upload progress indicator
    const progressBar = document.getElementById('upload-progress');
    if (progressBar) {
      progressBar.style.display = 'block';
      progressBar.style.width = percent + '%';
    }
  }

  hideUploadProgress() {
    const progressBar = document.getElementById('upload-progress');
    if (progressBar) {
      progressBar.style.display = 'none';
    }
  }

  // Emoji picker methods
  toggleEmojiPicker() {
    this.elements.emojiPicker.classList.toggle('show');
  }

  hideEmojiPicker() {
    this.elements.emojiPicker.classList.remove('show');
  }

  insertEmoji(emoji) {
    const cursorPos = this.elements.messageInput.selectionStart;
    const textBefore = this.elements.messageInput.value.substring(0, cursorPos);
    const textAfter = this.elements.messageInput.value.substring(cursorPos);
    
    this.elements.messageInput.value = textBefore + emoji + textAfter;
    this.elements.messageInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
    this.elements.messageInput.focus();
    this.hideEmojiPicker();
    this.updateSendButton();
  }

  // Mobile sidebar methods
  toggleSidebar() {
    this.elements.sidebar.classList.toggle('open');
  }

  closeSidebar() {
    this.elements.sidebar.classList.remove('open');
  }

  // Auto-resize textarea
  autoResize() {
    const textarea = this.elements.messageInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  // Update send button state
  updateSendButton() {
    const hasText = this.elements.messageInput.value.trim().length > 0;
    this.elements.sendBtn.disabled = !hasText || !this.socket.connected;
  }

  // Scroll to bottom
  scrollToBottom() {
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }

  // Activity monitoring
  startActivityMonitor() {
    setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivity;
      
      // Mark as away after 5 minutes of inactivity
      if (timeSinceLastActivity > 5 * 60 * 1000) {
        this.socket.emit('user_away');
      }
    }, 60000); // Check every minute
  }

  updateLastActivity() {
    this.lastActivity = Date.now();
    this.socket.emit('user_active');
  }

  // Utility methods
  getInitials(name) {
    return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  formatTime(timeString) {
    // If timeString is already formatted, return as is
    if (typeof timeString === 'string' && timeString.includes(':')) {
      return timeString;
    }
    
    // Otherwise format as time
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getFileIcon(extension) {
    const iconMap = {
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝',
      'txt': '📄',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'webp': '🖼️',
      'mp4': '🎥',
      'mp3': '🎵',
      'wav': '🎵',
      'zip': '📦',
      'rar': '📦',
      'xlsx': '📊',
      'pptx': '📽️'
    };
    return iconMap[extension.toLowerCase()] || '📎';
  }

  // Notification methods
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      zIndex: '10000',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease',
      maxWidth: '300px',
      wordWrap: 'break-word'
    });
    
    // Set background color based on type
    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    notification.style.background = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  // Desktop notification
  async showDesktopNotification(sender, message) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(`${sender} says:`, {
        body: message.substring(0, 100),
        icon: '/favicon.ico',
        tag: 'chat-message'
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.showDesktopNotification(sender, message);
      }
    }
  }

  // Logout method
  logout() {
    if (confirm('Are you sure you want to sign out?')) {
      this.socket.disconnect();
      window.location.href = '/logout';
    }
  }
}

// Sound management
class SoundManager {
  constructor() {
    this.sounds = {
      message: new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBC2G0fPWeywGKoPL8dvw'),
      notification: new Audio('data:audio/wav;base64,UklGRiQEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAEAAA=')
    };
    
    this.enabled = localStorage.getItem('soundEnabled') !== 'false';
  }

  play(soundName) {
    if (this.enabled && this.sounds[soundName]) {
      this.sounds[soundName].currentTime = 0;
      this.sounds[soundName].play().catch(() => {
        // Ignore autoplay policy errors
      });
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('soundEnabled', this.enabled.toString());
    return this.enabled;
  }
}

// Theme management
class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('theme') || 'auto';
    this.applyTheme();
  }

  setTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem('theme', theme);
    this.applyTheme();
  }

  applyTheme() {
    const body = document.body;
    body.className = body.className.replace(/theme-\w+/g, '');
    
    if (this.currentTheme === 'auto') {
      // Use system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      body.classList.add(isDark ? 'theme-dark' : 'theme-light');
    } else {
      body.classList.add(`theme-${this.currentTheme}`);
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize main app
  window.chatApp = new ChatApp();
  window.soundManager = new SoundManager();
  window.themeManager = new ThemeManager();
  
  // Global logout function
  window.logout = () => window.chatApp.logout();
  
  // Focus message input
  if (window.chatApp.elements.messageInput) {
    window.chatApp.elements.messageInput.focus();
  }
  
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  
  // Add entrance animation
  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.5s ease';
    document.body.style.opacity = '1';
  }, 100);
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (window.chatApp && window.chatApp.socket) {
    window.chatApp.socket.disconnect();
  }
});
