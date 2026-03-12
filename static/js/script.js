// Chatbot Frontend JavaScript - Enhanced UX Version

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const suggestions = document.getElementById('suggestions');

// State variables
let isWaitingForResponse = false;
let messageCount = 0;
let currentTypingTimeout = null;
let isTyping = false;

// Typing sounds (optional - remove if you don't want sounds)
// const typingSound = new Audio('/static/sounds/typing.mp3'); // Add if you want sound

// Message history for undo feature
let lastMessage = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeChat();
    setupEventListeners();
    showWelcomeAnimation();
});

// Initialize chat
function initializeChat() {
    userInput.focus();
    updateSendButtonState();
    loadSavedTheme();
}

// Setup all event listeners
function setupEventListeners() {
    // Enter key to send
    userInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    
    // Input validation and auto-resize
    userInput.addEventListener('input', function() {
        updateSendButtonState();
        autoResizeInput();
        showTypingIndicator();
    });
    
    // Handle paste events
    userInput.addEventListener('paste', function(e) {
        setTimeout(updateSendButtonState, 10);
    });
    
    // Click anywhere to focus input
    document.querySelector('.chat-container').addEventListener('click', function(e) {
        if (!isWaitingForResponse && !e.target.classList.contains('control-btn')) {
            userInput.focus();
        }
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K to clear chat
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            clearChat();
        }
        // Ctrl/Cmd + H to show history
        if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
            e.preventDefault();
            showHistory();
        }
        // Escape to clear input
        if (e.key === 'Escape') {
            userInput.value = '';
            updateSendButtonState();
        }
    });
}

// Auto-resize textarea
function autoResizeInput() {
    userInput.style.height = 'auto';
    userInput.style.height = (userInput.scrollHeight) + 'px';
    
    // Limit maximum height
    if (userInput.scrollHeight > 150) {
        userInput.style.height = '150px';
        userInput.style.overflowY = 'auto';
    } else {
        userInput.style.overflowY = 'hidden';
    }
}

// Update send button state
function updateSendButtonState() {
    const hasText = userInput.value.trim().length > 0;
    sendButton.disabled = !hasText || isWaitingForResponse;
    
    if (hasText && !isWaitingForResponse) {
        sendButton.classList.add('active');
    } else {
        sendButton.classList.remove('active');
    }
}

// Show typing indicator in input
let typingTimeout;
function showTypingIndicator() {
    clearTimeout(typingTimeout);
    if (!isTyping) {
        isTyping = true;
        // Could add visual feedback here
    }
    
    typingTimeout = setTimeout(() => {
        isTyping = false;
    }, 1000);
}

// Show welcome animation
function showWelcomeAnimation() {
    const messages = [
        "🌟 Ready to assist you!",
        "💬 Ask me anything about our services",
        "⚡ Quick responses guaranteed"
    ];
    
    let index = 0;
    const interval = setInterval(() => {
        if (index < messages.length) {
            const welcomeMsg = document.querySelector('.welcome-message');
            if (welcomeMsg) {
                welcomeMsg.innerHTML = `👋 Hello! I'm AssistBot.<br><small>${messages[index]}</small>`;
            }
            index++;
        } else {
            clearInterval(interval);
        }
    }, 1500);
}

// Send message function
async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message || isWaitingForResponse) {
        shakeInput();
        return;
    }

    // Save for potential undo
    lastMessage = message;
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    updateSendButtonState();
    
    // Add user message with animation
    await addMessageWithAnimation(message, 'user');
    
    // Show typing indicator
    setWaitingState(true);
    const typingIndicatorId = showBotTyping();
    
    try {
        console.log('Sending message:', message);
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received data:', data);
        
        // Remove typing indicator
        removeTypingIndicator(typingIndicatorId);
        
        // Add bot response with typing effect
        await typeWriterEffect(data.response, 'bot', data.timestamp);
        
        // Increment message count
        messageCount++;
        
        // Show feedback request after 5 messages
        if (messageCount === 5) {
            setTimeout(() => {
                addMessage("How am I doing? 😊", 'bot', null, true);
            }, 2000);
        }
        
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator(typingIndicatorId);
        
        // Show error message with retry option
        showErrorMessage(error);
        
    } finally {
        setWaitingState(false);
    }
}

// Add message with animation
async function addMessageWithAnimation(text, sender, timestamp = null) {
    return new Promise((resolve) => {
        const messageDiv = createMessageElement(sender, timestamp);
        const contentDiv = messageDiv.querySelector('.message-content');
        
        chatMessages.appendChild(messageDiv);
        
        // Slide in animation
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            messageDiv.style.transition = 'all 0.3s ease';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
            contentDiv.textContent = text;
            scrollToBottom();
            resolve();
        }, 50);
    });
}

// Typewriter effect for bot responses
async function typeWriterEffect(text, sender, timestamp = null, speed = 20) {
    return new Promise((resolve) => {
        const messageDiv = createMessageElement(sender, timestamp);
        const contentDiv = messageDiv.querySelector('.message-content');
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        
        let i = 0;
        contentDiv.textContent = '';
        
        function type() {
            if (i < text.length) {
                contentDiv.textContent += text.charAt(i);
                i++;
                
                // Random typing speed variation
                const randomSpeed = speed + Math.random() * 10;
                setTimeout(type, randomSpeed);
                
                // Auto-scroll while typing
                scrollToBottom();
            } else {
                // Add a subtle completion animation
                contentDiv.style.transition = 'background-color 0.3s';
                contentDiv.style.backgroundColor = '#f0f9ff';
                setTimeout(() => {
                    contentDiv.style.backgroundColor = '';
                }, 300);
                resolve();
            }
        }
        
        type();
    });
}

// Create message element
function createMessageElement(sender, timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = timestamp || getCurrentTime();
    
    // Add avatar for bot messages
    if (sender === 'bot') {
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'bot-avatar';
        avatarDiv.textContent = '🤖';
        messageDiv.appendChild(avatarDiv);
    }
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    
    return messageDiv;
}

// Show bot typing indicator with animation
function showBotTyping() {
    const id = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-message';
    typingDiv.id = id;
    
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'typing-indicator';
    indicatorDiv.innerHTML = `
        <span style="animation-delay: 0s"></span>
        <span style="animation-delay: 0.2s"></span>
        <span style="animation-delay: 0.4s"></span>
    `;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'bot-avatar';
    avatarDiv.textContent = '🤖';
    
    typingDiv.appendChild(avatarDiv);
    typingDiv.appendChild(indicatorDiv);
    
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    
    return id;
}

// Remove typing indicator
function removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) {
        indicator.style.transition = 'opacity 0.3s';
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 300);
    }
}

// Show error message with retry option
function showErrorMessage(error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message bot-message error-message';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `
        ⚠️ Connection error. 
        <button onclick="retryLastMessage()" class="retry-btn">Retry</button>
        <button onclick="dismissError(this)" class="dismiss-btn">Dismiss</button>
    `;
    
    errorDiv.appendChild(contentDiv);
    chatMessages.appendChild(errorDiv);
    scrollToBottom();
}

// Retry last message
function retryLastMessage() {
    if (lastMessage) {
        userInput.value = lastMessage;
        sendMessage();
        dismissError();
    }
}

// Dismiss error
function dismissError(btn) {
    const errorMsg = btn.closest('.error-message');
    if (errorMsg) {
        errorMsg.style.transition = 'opacity 0.3s';
        errorMsg.style.opacity = '0';
        setTimeout(() => errorMsg.remove(), 300);
    }
}

// Shake input for invalid action
function shakeInput() {
    userInput.classList.add('shake');
    setTimeout(() => userInput.classList.remove('shake'), 500);
}

// Send quick message from suggestion chips
function sendQuickMessage(text) {
    userInput.value = text;
    autoResizeInput();
    sendMessage();
    
    // Highlight clicked suggestion
    const chips = document.querySelectorAll('.suggestion-chip');
    chips.forEach(chip => {
        if (chip.textContent.includes(text)) {
            chip.classList.add('clicked');
            setTimeout(() => chip.classList.remove('clicked'), 300);
        }
    });
}

// Show conversation history with animation
async function showHistory() {
    try {
        const response = await fetch('/api/history');
        const data = await response.json();
        
        if (data.history.length === 0) {
            await typeWriterEffect('📭 No conversation history yet.', 'bot');
            return;
        }
        
        await typeWriterEffect('📜 **Conversation History:**', 'bot');
        
        // Show history with delay between messages
        for (const entry of data.history) {
            await typeWriterEffect(`[${entry.timestamp}]`, 'bot');
            await typeWriterEffect(`👤 You: ${entry.user}`, 'bot');
            await typeWriterEffect(`🤖 Bot: ${entry.bot}`, 'bot');
            await typeWriterEffect('---', 'bot');
        }
        
    } catch (error) {
        console.error('Error:', error);
        await typeWriterEffect('❌ Error loading history.', 'bot');
    }
}

// Clear conversation history
async function clearHistory() {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to clear all conversation history?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/clear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            await typeWriterEffect('✅ Conversation history cleared successfully!', 'bot');
        } else {
            await typeWriterEffect('❌ Failed to clear history.', 'bot');
        }
    } catch (error) {
        console.error('Error:', error);
        await typeWriterEffect('❌ Error clearing history.', 'bot');
    }
}

// Clear chat with fade out animation
function clearChat() {
    // Fade out all messages
    const messages = document.querySelectorAll('.message');
    messages.forEach((msg, index) => {
        setTimeout(() => {
            msg.style.transition = 'opacity 0.3s, transform 0.3s';
            msg.style.opacity = '0';
            msg.style.transform = 'translateY(-20px)';
        }, index * 50);
    });
    
    // Remove and add welcome after animation
    setTimeout(() => {
        while (chatMessages.firstChild) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
        
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerHTML = '👋 Hello! I\'m AssistBot. How can I help you today?<br>' +
                              '<small>Ask me about store hours, location, services, etc.</small>';
        chatMessages.appendChild(welcomeDiv);
        messageCount = 0;
    }, messages.length * 50 + 100);
}

// Theme toggling (light/dark)
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Load saved theme
function loadSavedTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

// Get current time
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Smooth scroll to bottom
function scrollToBottom() {
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
    });
}

// Set waiting state
function setWaitingState(waiting) {
    isWaitingForResponse = waiting;
    updateSendButtonState();
    userInput.disabled = waiting;
    
    if (!waiting) {
        userInput.focus();
    }
}

// Add this CSS to your style.css for animations
const additionalStyles = `
    /* Shake animation */
    .shake {
        animation: shake 0.5s;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    /* Bot avatar */
    .bot-avatar {
        width: 30px;
        height: 30px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        margin-right: 10px;
        font-size: 16px;
    }
    
    .bot-message {
        display: flex;
        align-items: flex-start;
    }
    
    /* Retry button */
    .retry-btn, .dismiss-btn {
        padding: 5px 10px;
        margin: 0 5px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 12px;
    }
    
    .retry-btn {
        background: #667eea;
        color: white;
    }
    
    .dismiss-btn {
        background: #f0f0f0;
        color: #333;
    }
    
    /* Suggestion chip click animation */
    .suggestion-chip.clicked {
        transform: scale(0.95);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    
    /* Send button active state */
    .send-button.active {
        transform: scale(1.05);
        box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }
    
    /* Dark theme */
    body.dark-theme .chat-container {
        background: #1a1a1a;
        color: white;
    }
    
    body.dark-theme .chat-messages {
        background: #2d2d2d;
    }
    
    body.dark-theme .bot-message .message-content {
        background: #3d3d3d;
        color: white;
    }
    
    body.dark-theme .chat-input {
        background: #3d3d3d;
        color: white;
        border-color: #4d4d4d;
    }
    
    /* Typing indicator enhancement */
    .typing-indicator {
        background: #f0f0f0;
        padding: 15px 20px;
        border-radius: 20px;
        display: inline-flex;
        align-items: center;
    }
    
    body.dark-theme .typing-indicator {
        background: #3d3d3d;
    }
`;

// Add styles to document
const styleSheet = document.createElement("style");
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Export functions for HTML buttons
window.sendMessage = sendMessage;
window.sendQuickMessage = sendQuickMessage;
window.showHistory = showHistory;
window.clearHistory = clearHistory;
window.clearChat = clearChat;
window.toggleTheme = toggleTheme;
window.retryLastMessage = retryLastMessage;
window.dismissError = dismissError;