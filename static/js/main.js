let lastMessageCount = 0;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB
let currentAttachment = null;

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function createMessageElement(message) {
    const div = document.createElement('div');
    div.className = 'message';
    
    // Add sent/received class based on user ID
    const currentUserId = document.getElementById('userId').textContent;
    div.classList.add(message.user_id === currentUserId ? 'sent' : 'received');
    
    const header = document.createElement('div');
    header.className = 'header';
    header.textContent = `User${message.user_id} • ${formatTime(message.timestamp)}`;
    
    const content = document.createElement('div');
    content.className = 'content';
    
    switch(message.type) {
        case 'text':
            content.textContent = message.content;
            break;
            
        case 'image':
            const img = document.createElement('img');
            img.src = message.content;
            img.loading = 'lazy';
            content.appendChild(img);
            break;
            
        case 'video':
            const video = document.createElement('video');
            video.src = message.content;
            video.controls = true;
            video.preload = 'metadata';
            content.appendChild(video);
            break;
    }
    
    div.appendChild(header);
    div.appendChild(content);
    return div;
}

function clearAttachment() {
    currentAttachment = null;
    const preview = document.getElementById('attachmentPreview');
    preview.style.display = 'none';
    preview.innerHTML = '';
    document.getElementById('fileInput').value = '';
}

function showAttachmentPreview(file) {
    const preview = document.getElementById('attachmentPreview');
    preview.innerHTML = '';
    preview.style.display = 'block';

    const removeButton = document.createElement('div');
    removeButton.className = 'remove-attachment';
    removeButton.textContent = '×';
    removeButton.onclick = clearAttachment;

    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';
    fileInfo.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`;

    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        preview.appendChild(img);
    } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.controls = true;
        preview.appendChild(video);
    }

    preview.appendChild(removeButton);
    preview.appendChild(fileInfo);
}

async function loadMessages() {
    try {
        console.log('Fetching messages...');
        const response = await fetch('/api/messages');
        const messages = await response.json();
        console.log('Received messages:', messages);
        
        const container = document.getElementById('messageContainer');
        
        // Only update if we have new messages
        if (messages.length !== lastMessageCount) {
            console.log('Updating messages in container');
            container.innerHTML = '';
            
            messages.forEach(message => {
                container.appendChild(createMessageElement(message));
            });
            
            // Scroll to bottom
            container.scrollTop = container.scrollHeight;
            lastMessageCount = messages.length;
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content && !currentAttachment) return;
    
    try {
        if (currentAttachment) {
            const maxSize = currentAttachment.type.startsWith('image/') ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
            if (currentAttachment.size > maxSize) {
                alert(`File too large. Maximum size is ${maxSize/1024/1024}MB`);
                return;
            }

            const reader = new FileReader();
            reader.onload = async function(e) {
                await fetch('/api/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        content: e.target.result,
                        type: currentAttachment.type.startsWith('image/') ? 'image' : 'video'
                    })
                });
                clearAttachment();
                await loadMessages();
            };
            reader.readAsDataURL(currentAttachment);
        }

        if (content) {
            console.log('Sending message:', content);
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    content: content,
                    type: 'text'
                })
            });
            
            if (response.ok) {
                console.log('Message sent successfully');
                input.value = '';
                await loadMessages();
            } else {
                console.error('Failed to send message:', await response.text());
            }
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// File input handler
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        currentAttachment = file;
        showAttachmentPreview(file);
    }
});

// Add event listener for Enter key
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Emoji picker setup
const emojiButton = document.getElementById('emojiButton');
const emojiPicker = document.getElementById('emojiPicker');
let picker = null;

emojiButton.addEventListener('click', () => {
    if (!picker) {
        picker = new EmojiMart.Picker({
            onSelect: emoji => {
                const input = document.getElementById('messageInput');
                input.value += emoji.native;
                input.focus();
            }
        });
        emojiPicker.appendChild(picker);
    }
    emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiButton) {
        emojiPicker.style.display = 'none';
    }
});

// Load messages more frequently (every 500ms)
setInterval(loadMessages, 500);

// Initial load
console.log('Starting application...');
loadMessages();

// Add this to check if the script is running
console.log('Chat script loaded and running');