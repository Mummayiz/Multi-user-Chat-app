// Professional ChatFlow JavaScript - Enhanced Version
class ChatApp {
  constructor() {
    this.socket = io();
    this.username = null;
    this.currentUser = null;
    this.isTyping = false;
    this.typingTimer = null;
    this.lastActivity = Date.now();
    this.currentTheme = localStorage.getItem('theme') || 'light';
    this.notificationsEnabled = localStorage.getItem('notifications') !== 'false';
    this.soundEnabled = localStorage.getItem('sound') !== 'false';
    
    this.initElements();
    this.initEventListeners();
    this.initEmojiPicker();
    this.initSocket();
    this.initTheme();
    this.startActivityMonitor();
    this.initNotifications();
  }

  // Initialize DOM elements
  initElements() {
    this.elements = {
      // Connection status
      statusDot: document.getElementById('status-dot'),
      connectionText: document.getElementById('connection-text'),
      connectionStatus: document.getElementById('connection-status'),
      
      // User info
      currentUserName: document.getElementById('current-user-name'),
      userAvatar: document.getElementById('user-avatar'),
      onlineCount: document.getElementById('online-count'),
      userList: document.getElementById('user-list'),
      userSearch: document.getElementById('user-search'),
      
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
      
      // Controls
      themeToggle: document.getElementById('theme-toggle'),
      notificationsToggle: document.getElementById('notifications-toggle'),
      settingsBtn: document.getElementById('settings-btn'),
      
      // Mobile
      sidebar: document.getElementById('sidebar'),
      mobileMenuBtn: document.querySelector('.mobile-menu-btn')
    };
  }

  // Initialize event listeners
  initEventListeners() {
    // Message input events
    this.elements.messageInput?.addEventListener('input', () => {
      this.handleTyping();
      this.autoResize();
      this.updateSendButton();
    });

    this.elements.messageInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button
    this.elements.sendBtn?.addEventListener('click', () => this.sendMessage());

    // File upload
    this.elements.fileInput?.addEventListener('change', (e) => this.handleFileUpload(e));
    this.elements.fileBtn?.addEventListener('click', () => this.elements.fileInput?.click());

    // Emoji picker
    this.elements.emojiBtn?.addEventListener('click', () => this.toggleEmojiPicker());

    // Theme toggle
    this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());

    // Notifications toggle
    this.elements.notificationsToggle?.addEventListener('click', () => this.toggleNotifications());

    // User search
    this.elements.userSearch?.addEventListener('input', () => this.filterUsers());

    // Mobile menu
    if (this.elements.mobileMenuBtn) {
      this.elements.mobileMenuBtn.addEventListener('click', () => this.toggleSidebar());
    }

    // Global click handler
    document.addEventListener('click', (e) => this.handleGlobalClick(e));

    // Window resize
    window.addEventListener('resize', () => this.handleResize());

    // Page visibility
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateLastActivity();
      }
    });

    // Activity tracking
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => this.updateLastActivity(), { passive: true });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  // Initialize theme system
  initTheme() {
    this.applyTheme();
    this.updateThemeToggle();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    
    // Add smooth transition for theme changes
    if (this.themeTransitionTimeout) {
      clearTimeout(this.themeTransitionTimeout);
    }
    
    document.documentElement.style.transition = 'color 0.3s ease, background-color 0.3s ease';
    this.themeTransitionTimeout = setTimeout(() => {
      document.documentElement.style.transition = '';
    }, 300);
  }

  updateThemeToggle() {
    if (this.elements.themeToggle) {
      const icon = this.elements.themeToggle.querySelector('i');
      if (icon) {
        icon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      }
    }
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', this.currentTheme);
    this.applyTheme();
    this.updateThemeToggle();
    this.showNotification(`Switched to ${this.currentTheme} theme`, 'success');
  }

  // Notifications management
  async initNotifications() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    this.updateNotificationsToggle();
  }

  updateNotificationsToggle() {
    if (this.elements.notificationsToggle) {
      const icon = this.elements.notificationsToggle.querySelector('i');
      if (icon) {
        icon.className = this.notificationsEnabled ? 'fas fa-bell' : 'fas fa-bell-slash';
      }
    }
  }

  toggleNotifications() {
    this.notificationsEnabled = !this.notificationsEnabled;
    localStorage.setItem('notifications', this.notificationsEnabled.toString());
    this.updateNotificationsToggle();
    this.showNotification(
      `Notifications ${this.notificationsEnabled ? 'enabled' : 'disabled'}`, 
      'info'
    );
  }

  // User search functionality
  filterUsers() {
    if (!this.elements.userSearch || !this.elements.userList) return;
    
    const searchTerm = this.elements.userSearch.value.toLowerCase();
    const userItems = this.elements.userList.querySelectorAll('.user-item');
    
    userItems.forEach(item => {
      const userName = item.querySelector('.user-item-name')?.textContent.toLowerCase() || '';
      item.style.display = userName.includes(searchTerm) ? 'flex' : 'none';
    });
  }

  // Initialize emoji picker with enhanced emojis
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
      '🎈', '🎁', '🎂', '🎄', '🎃', '👻', '🎭', '🏆',
      '🎯', '🎲', '🎮', '🕹️', '🎨', '🎭', '🎪', '🎨'
    ];

    if (this.elements.emojiGrid) {
      this.elements.emojiGrid.innerHTML = '';
      emojis.forEach(emoji => {
        const emojiElement = document.createElement('div');
        emojiElement.className = 'emoji';
        emojiElement.textContent = emoji;
        emojiElement.onclick = () => this.insertEmoji(emoji);
        emojiElement.title = emoji; // Accessibility
        this.elements.emojiGrid.appendChild(emojiElement);
      });
    }
  }

  // Initialize socket events
  initSocket() {
    this.socket.on('connect', () => {
      this.updateConnectionStatus(true);
      this.socket.emit('join');
      this.showNotification('Connected to chat', 'success');
    });

    this.socket.on('disconnect', () => {
      this.updateConnectionStatus(false);
      this.showNotification('Disconnected from chat', 'warning');
    });

    this.socket.on('connect_error', (error) => {
      this.updateConnectionStatus(false, 'Connection Error');
      this.showNotification('Connection error. Please refresh the page.', 'error');
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
      if (this.soundEnabled && data.user !== this.currentUser) {
        this.playNotificationSound();
      }
    });

    this.socket.on('user_typing', (data) => {
      this.showTypingIndicator(data.username);
    });

    this.socket.on('user_stopped_typing', (data) => {
      this.hideTypingIndicator(data.username);
    });

    // Enhanced error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.showNotification('An error occurred. Please try again.', 'error');
    });
  }

  // Enhanced connection status updates
  updateConnectionStatus(connected, customText = null) {
    if (!this.elements.statusDot || !this.elements.connectionText) return;

    if (connected) {
      this.elements.statusDot.classList.remove('disconnected');
      this.elements.connectionText.textContent = customText || 'Connected';
      this.elements.connectionStatus?.classList.add('connected');
      this.elements.connectionStatus?.classList.remove('disconnected');
    } else {
      this.elements.statusDot.classList.add('disconnected');
      this.elements.connectionText.textContent = customText || 'Disconnected';
      this.elements.connectionStatus?.classList.remove('connected');
      this.elements.connectionStatus?.classList.add('disconnected');
    }
    this.updateSendButton();
  }

  // Enhanced user list updates
  updateUserList(users) {
    if (!this.elements.userList || !this.elements.onlineCount) return;

    this.elements.userList.innerHTML = '';
    const userCount = users.length;
    
    this.elements.onlineCount.innerHTML = `
      <i class="fas fa-circle" style="color: var(--success-color); font-size: 8px;"></i>
      <span>${userCount} user${userCount !== 1 ? 's' : ''} online</span>
    `;
    
    users.forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      
      if (user === this.currentUser) {
        userItem.classList.add('current-user');
        if (this.elements.currentUserName) {
          this.elements.currentUserName.textContent = user;
        }
        if (this.elements.userAvatar) {
          this.elements.userAvatar.textContent = this.getInitials(user);
        }
      }
      
      const initials = this.getInitials(user);
      userItem.innerHTML = `
        <div class="user-item-avatar">${initials}</div>
        <div class="user-item-info">
          <div class="user-item-name">${this.escapeHtml(user)}</div>
          <div class="user-item-status">
            <div class="status-indicator"></div>
            <span>Online</span>
          </div>
        </div>
      `;
      
      // Add user interaction
      userItem.addEventListener('click', () => {
        this.showNotification(`Clicked on ${user}`, 'info');
      });
      
      this.elements.userList.appendChild(userItem);
    });
    
    // Reapply search filter
    this.filterUsers();
  }

  // Enhanced message display
  displayMessage(data) {
    if (!this.elements.messages) return;

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
            <div class="file-message" onclick="this.downloadFile('${data.filename}', '${data.original_name}')">
              <div class="file-info">
                <div class="file-icon">${fileIcon}</div>
                <div class="file-details">
                  <div class="file-name">${this.escapeHtml(data.original_name)}</div>
                  <div class="file-meta">Click to download</div>
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
    
    // Show desktop notification for new messages when tab is not visible
    if (document.hidden && !isOwn && !isSystem && this.notificationsEnabled) {
      this.showDesktopNotification(data.user, data.text);
    }
  }

  // Enhanced message text processing
  processMessageText(text) {
    let processedText = this.escapeHtml(text);
    
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    processedText = processedText.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>');
    
    // Convert line breaks
    processedText = processedText.replace(/\n/g, '<br>');
    
    // Convert @mentions (if needed)
    processedText = processedText.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    
    return processedText;
  }

  // File download handler
  downloadFile(filename, originalName) {
    const link = document.createElement('a');
    link.href = `/uploads/${filename}`;
    link.download = originalName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.showNotification(`Downloaded ${originalName}`, 'success');
  }

  // Enhanced send message
  sendMessage() {
    if (!this.elements.messageInput) return;

    const text = this.elements.messageInput.value.trim();
    if (text !== '' && this.socket.connected) {
      this.socket.emit('message', { text });
      this.elements.messageInput.value = '';
      this.autoResize();
      this.updateSendButton();
      this.stopTyping();
      
      // Focus back to input
      this.elements.messageInput.focus();
    }
  }

  // Enhanced typing indicator
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
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.style.display = 'flex';
      const textElement = indicator.querySelector('#typing-text');
      if (textElement) {
        textElement.textContent = `${username} is typing...`;
      }
    }
  }

  hideTypingIndicator(username) {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  // Enhanced file upload handling
  async handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      this.showNotification('File size must be less than 16MB', 'error');
      event.target.value = '';
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4', 'audio/mpeg', 'application/zip'
    ];

    if (!allowedTypes.includes(file.type)) {
      this.showNotification('File type not supported', 'error');
      event.target.value = '';
      return;
    }

    this.showUploadProgress(true);
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
        this.showNotification('File uploaded successfully', 'success');
      } else {
        const error = await response.json();
        this.showNotification(error.error || 'File upload failed', 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      this.showNotification('File upload failed. Please check your connection.', 'error');
    } finally {
      this.showUploadProgress(false);
      event.target.value = '';
    }
  }

  // Upload progress indicator
  showUploadProgress(show) {
    if (show) {
      this.showNotification('Uploading file...', 'info');
    }
  }

  // Emoji picker methods
  toggleEmojiPicker() {
    if (this.elements.emojiPicker) {
      this.elements.emojiPicker.classList.toggle('show');
    }
  }

  hideEmojiPicker() {
    if (this.elements.emojiPicker) {
      this.elements.emojiPicker.classList.remove('show');
    }
  }

  insertEmoji(emoji) {
    if (!this.elements.messageInput) return;

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
    if (this.elements.sidebar) {
      this.elements.sidebar.classList.toggle('open');
    }
  }

  closeSidebar() {
    if (this.elements.sidebar) {
      this.elements.sidebar.classList.remove('open');
    }
  }

  // Auto-resize textarea
  autoResize() {
    if (!this.elements.messageInput) return;

    this.elements.messageInput.style.height = 'auto';
    this.elements.messageInput.style.height = Math.min(this.elements.messageInput.scrollHeight, 120) + 'px';
  }

  // Update send button state
  updateSendButton() {
    if (!this.elements.sendBtn || !this.elements.messageInput) return;

    const hasText = this.elements.messageInput.value.trim().length > 0;
    this.elements.sendBtn.disabled = !hasText || !this.socket.connected;
  }

  // Scroll to bottom
  scrollToBottom() {
    if (this.elements.messages) {
      this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }
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

  // Global event handlers
  handleGlobalClick(e) {
    // Close emoji picker when clicking outside
    if (this.elements.emojiPicker && 
        !this.elements.emojiPicker.contains(e.target) && 
        e.target !== this.elements.emojiBtn && 
        !e.target.closest('#emoji-btn')) {
      this.hideEmojiPicker();
    }
    
    // Close sidebar on mobile when clicking outside
    if (window.innerWidth <= 768 && 
        this.elements.sidebar &&
        !this.elements.sidebar.contains(e.target) && 
        !e.target.classList.contains('mobile-menu-btn') && 
        !e.target.closest('.mobile-menu-btn')) {
      this.closeSidebar();
    }
  }

  handleResize() {
    if (window.innerWidth > 768) {
      this.closeSidebar();
    }
  }

  // Keyboard shortcuts
  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      this.elements.userSearch?.focus();
    }

    // Ctrl/Cmd + / to focus message input
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      this.elements.messageInput?.focus();
    }

    // Escape to close modals
    if (e.key === 'Escape') {
      this.hideEmojiPicker();
      this.closeSidebar();
    }
  }

  // Sound management
  playNotificationSound() {
    if (!this.soundEnabled) return;

    try {
      // Create a simple notification sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
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
      'xls': '📊',
      'pptx': '📽️',
      'ppt': '📽️'
    };
    return iconMap[extension.toLowerCase()] || '📎';
  }

  // Enhanced notification system
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Create notification content
    const icon = this.getNotificationIcon(type);
    notification.innerHTML = `
      <div class="notification-content">
        <i class="${icon}"></i>
        <span>${message}</span>
      </div>
    `;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '12px',
      color: 'white',
      fontWeight: '500',
      zIndex: '10000',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      maxWidth: '350px',
      wordWrap: 'break-word',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    });
    
    // Set background color based on type
    const colors = {
      success: 'linear-gradient(135deg, #10b981, #059669)',
      error: 'linear-gradient(135deg, #ef4444, #dc2626)',
      warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
      info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
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

    // Make notification clickable to dismiss
    notification.addEventListener('click', () => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
  }

  getNotificationIcon(type) {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-triangle',
      warning: 'fas fa-exclamation-circle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
  }

  // Desktop notification
  async showDesktopNotification(sender, message) {
    if (!('Notification' in window) || !this.notificationsEnabled) return;
    
    if (Notification.permission === 'granted') {
      const notification = new Notification(`${sender} says:`, {
        body: message.substring(0, 100),
        icon: '/favicon.ico',
        tag: 'chat-message',
        badge: '/favicon.ico',
        requireInteraction: false
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.showDesktopNotification(sender, message);
      }
    }
  }

  // Enhanced logout method
  logout() {
    if (confirm('Are you sure you want to sign out?')) {
      this.showNotification('Signing out...', 'info');
      this.socket.disconnect();
      
      // Clear local storage
      localStorage.removeItem('theme');
      localStorage.removeItem('notifications');
      localStorage.removeItem('sound');
      
      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = '/logout';
      }, 1000);
    }
  }
}

// Enhanced Sound Management Class
class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('soundEnabled') !== 'false';
    this.audioContext = null;
    this.initAudioContext();
  }

  async initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  playNotification() {
    if (!this.enabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Could not play sound:', error);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('soundEnabled', this.enabled.toString());
    return this.enabled;
  }
}

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      messageCount: 0,
      connectionTime: Date.now(),
      lastLag: 0
    };
    
    this.startMonitoring();
  }

  startMonitoring() {
    // Monitor connection lag
    setInterval(() => {
      const start = Date.now();
      if (window.chatApp && window.chatApp.socket.connected) {
        window.chatApp.socket.emit('ping', start);
      }
    }, 30000); // Every 30 seconds
  }

  recordMessage() {
    this.metrics.messageCount++;
  }

  recordLag(lag) {
    this.metrics.lastLag = lag;
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.connectionTime
    };
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize main app
  window.chatApp = new ChatApp();
  window.soundManager = new SoundManager();
  window.performanceMonitor = new PerformanceMonitor();
  
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
  const body = document.body;
  body.style.opacity = '0';
  setTimeout(() => {
    body.style.transition = 'opacity 0.5s ease';
    body.style.opacity = '1';
  }, 100);

  // Service worker registration (if available)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (window.chatApp && window.chatApp.socket) {
    window.chatApp.socket.disconnect();
  }
});

// Handle online/offline status
window.addEventListener('online', () => {
  if (window.chatApp) {
    window.chatApp.showNotification('Connection restored', 'success');
  }
});

window.addEventListener('offline', () => {
  if (window.chatApp) {
    window.chatApp.showNotification('Connection lost', 'warning');
  }
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChatApp, SoundManager, PerformanceMonitor };
}
