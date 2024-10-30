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
    div.classList.add(message.user_id === document.getElementById('userId').textContent ? 'sent' : 'received');
    
    const header = document.createElement('div');
    header.className = 'header';
    header.textContent = `User${message.user_id} • ${formatTime(message.timestamp)}`;
    div.appendChild(header);
    
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
            await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    content: content,
                    type: 'text'
                })
            });
            input.value = '';
        }
        
        await loadMessages();
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

async function loadMessages() {
    try {
        const response = await fetch('/api/messages');
        const messages = await response.json();
        
        if (messages.length !== lastMessageCount) {
            const container = document.getElementById('messageContainer');
            container.innerHTML = '';
            
            messages.forEach(message => {
                container.appendChild(createMessageElement(message));
            });
            
            container.scrollTop = container.scrollHeight;
            lastMessageCount = messages.length;
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Add event listener for Enter key
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Check for new messages every 1 second
setInterval(loadMessages, 1000);

// Initial load
loadMessages();