/**
 * Personal AI Assistant - Client Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    let activeConversationId = null;
    let conversations = [];
    let isGenerating = false;

    // DOM Elements
    const chatContainer = document.getElementById('chatContainer');
    const messagesList = document.getElementById('messagesList');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const typingIndicator = document.getElementById('typingIndicator');
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const modelSelect = document.getElementById('modelSelect');
    const activeChatTitle = document.getElementById('activeChatTitle');
    const conversationsList = document.getElementById('conversationsList');
    const newChatBtn = document.getElementById('newChatBtn');

    // Sidebar & Mobile Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    // Status Indicators
    const openRouterIndicator = document.getElementById('openRouterIndicator');
    const openRouterStatusText = document.getElementById('openRouterStatusText');
    const supabaseIndicator = document.getElementById('supabaseIndicator');
    const supabaseStatusText = document.getElementById('supabaseStatusText');

    // Modal
    const infoModal = document.getElementById('infoModal');
    const openInfoModalBtn = document.getElementById('openInfoModalBtn');
    const closeInfoModalBtn = document.getElementById('closeInfoModalBtn');
    const modalUnderstandBtn = document.getElementById('modalUnderstandBtn');

    // Theme Switcher
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    // 1. Konfigurasi Markdown (marked) & Syntax Highlighting
    marked.setOptions({
        highlight: function(code, lang) {
            const language = highlight.getLanguage(lang) ? lang : 'plaintext';
            return highlight.highlight(code, { language }).value;
        },
        breaks: true,
        gfm: true
    });

    // 2. Inisialisasi Aplikasi
    initApp();

    function initApp() {
        initTheme();
        checkSystemStatus();
        loadConversations();
        setupEventListeners();
        setupTextareaAutoResize();
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('nova_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.body.setAttribute('data-theme', savedTheme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('nova_theme', newTheme);
    }

    // 3. Status Backend (OpenRouter & Supabase)
    async function checkSystemStatus() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();

            // AI Router Status (9Router / OpenRouter)
            const isConfigured = data.ai_configured ?? data.openrouter_configured;
            const providerName = data.provider || 'AI Router';
            if (isConfigured) {
                openRouterIndicator.className = 'status-indicator online';
                openRouterStatusText.textContent = providerName;
            } else {
                openRouterIndicator.className = 'status-indicator fallback';
                openRouterStatusText.textContent = 'Belum diisi';
            }

            // Supabase Status
            if (data.supabase_configured) {
                supabaseIndicator.className = 'status-indicator online';
                supabaseStatusText.textContent = 'Aktif (Cloud)';
            } else {
                supabaseIndicator.className = 'status-indicator fallback';
                supabaseStatusText.textContent = 'In-Memory (Lokal)';
            }

            if (data.active_model && modelSelect) {
                // Seleksi model jika ada dalam list dropdown
                for (let i = 0; i < modelSelect.options.length; i++) {
                    if (modelSelect.options[i].value === data.active_model) {
                        modelSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        } catch (err) {
            console.error('Gagal memeriksa status sistem:', err);
            openRouterIndicator.className = 'status-indicator offline';
            openRouterStatusText.textContent = 'Offline';
            supabaseIndicator.className = 'status-indicator offline';
            supabaseStatusText.textContent = 'Offline';
        }
    }

    // 4. Manajemen Percakapan (Conversations)
    async function loadConversations() {
        try {
            const res = await fetch('/api/conversations');
            const data = await res.json();
            if (data.success) {
                conversations = data.conversations || [];
                renderConversationsList();
            }
        } catch (err) {
            console.error('Gagal mengambil riwayat:', err);
            conversationsList.innerHTML = '<div style="padding: 1rem; font-size: 0.8rem; color: #64748b;">Belum ada riwayat</div>';
        }
    }

    function renderConversationsList() {
        if (!conversations.length) {
            conversationsList.innerHTML = `
                <div style="padding: 0.8rem 0.5rem; font-size: 0.78rem; color: var(--text-muted); text-align: center;">
                    Belum ada riwayat obrolan
                </div>`;
            return;
        }

        conversationsList.innerHTML = '';
        conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = `conv-item ${conv.id === activeConversationId ? 'active' : ''}`;
            item.dataset.id = conv.id;

            item.innerHTML = `
                <div class="conv-title-wrap">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span class="conv-item-title">${escapeHtml(conv.title || 'Obrolan')}</span>
                </div>
                <button class="delete-conv-btn" title="Hapus Percakapan" aria-label="Hapus">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;

            // Switch conversation klik
            item.addEventListener('click', (e) => {
                if (e.target.closest('.delete-conv-btn')) return;
                switchConversation(conv.id, conv.title);
                closeSidebarMobile();
            });

            // Delete conversation klik
            const delBtn = item.querySelector('.delete-conv-btn');
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteConversation(conv.id);
            });

            conversationsList.appendChild(item);
        });
    }

    async function switchConversation(convId, title) {
        if (activeConversationId === convId) return;
        activeConversationId = convId;
        activeChatTitle.textContent = title || 'Obrolan';

        renderConversationsList();
        welcomeScreen.style.display = 'none';
        messagesList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">Memuat pesan...</div>';

        try {
            const res = await fetch(`/api/conversations/${convId}`);
            const data = await res.json();
            messagesList.innerHTML = '';

            if (data.success && data.messages && data.messages.length > 0) {
                data.messages.forEach(msg => {
                    appendMessageToUI(msg.role, msg.content, msg.created_at);
                });
                scrollToBottom();
            } else {
                welcomeScreen.style.display = 'block';
            }
        } catch (err) {
            console.error('Gagal memuat pesan:', err);
            messagesList.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 1rem;">Gagal memuat pesan</div>';
        }
    }

    async function deleteConversation(convId) {
        if (!confirm('Yakin ingin menghapus sesi percakapan ini?')) return;

        try {
            const res = await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                conversations = conversations.filter(c => c.id !== convId);
                if (activeConversationId === convId) {
                    resetToNewChat();
                } else {
                    renderConversationsList();
                }
            }
        } catch (err) {
            console.error('Gagal menghapus percakapan:', err);
        }
    }

    function resetToNewChat() {
        activeConversationId = null;
        activeChatTitle.textContent = 'Percakapan Baru';
        messagesList.innerHTML = '';
        welcomeScreen.style.display = 'block';
        messageInput.value = '';
        messageInput.style.height = 'auto';
        renderConversationsList();
        closeSidebarMobile();
    }

    // 5. Kirim & Render Pesan
    async function sendMessage(text) {
        const message = (text || messageInput.value).trim();
        if (!message || isGenerating) return;

        isGenerating = true;
        sendBtn.disabled = true;

        // Sembunyikan welcome screen jika sedang terbuka
        welcomeScreen.style.display = 'none';

        // Tampilkan pesan User di UI
        appendMessageToUI('user', message);
        messageInput.value = '';
        messageInput.style.height = 'auto';
        scrollToBottom();

        // Tampilkan typing indicator
        typingIndicator.style.display = 'flex';
        scrollToBottom();

        try {
            const payload = {
                message: message,
                conversation_id: activeConversationId,
                model: modelSelect.value
            };

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            // Sembunyikan typing indicator
            typingIndicator.style.display = 'none';

            if (data.success) {
                if (!activeConversationId && data.conversation_id) {
                    activeConversationId = data.conversation_id;
                    // Ambil title dari cuplikan teks pertama
                    const newTitle = message.substring(0, 30) + (message.length > 30 ? '...' : '');
                    activeChatTitle.textContent = newTitle;
                    await loadConversations();
                }
                appendMessageToUI('assistant', data.reply);
            } else {
                appendMessageToUI('assistant', `⚠️ **Terjadi Kesalahan:** ${data.error || 'Tidak dapat memproses pesan'}`);
            }
        } catch (err) {
            console.error('Chat error:', err);
            typingIndicator.style.display = 'none';
            appendMessageToUI('assistant', `❌ **Gagal terhubung:** Terjadi gangguan jaringan atau server.`);
        } finally {
            isGenerating = false;
            sendBtn.disabled = false;
            scrollToBottom();
            messageInput.focus();
        }
    }

    function appendMessageToUI(role, content, timestamp) {
        const row = document.createElement('div');
        row.className = `message-row ${role}`;

        const isUser = role === 'user';
        const avatarHtml = isUser ? `
            <div class="avatar user">U</div>
        ` : `
            <div class="avatar ai">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
            </div>
        `;

        let bubbleContentHtml = '';
        if (isUser) {
            bubbleContentHtml = `<div class="message-bubble">${escapeHtml(content)}</div>`;
        } else {
            // Render markdown untuk balasan AI
            const parsedHtml = marked.parse(content);
            bubbleContentHtml = `<div class="message-bubble">${parsedHtml}</div>`;
        }

        const timeStr = timestamp ? formatTime(timestamp) : formatTime(new Date());

        row.innerHTML = `
            ${!isUser ? avatarHtml : ''}
            <div class="message-body">
                ${bubbleContentHtml}
                <span class="message-meta">${timeStr}</span>
            </div>
            ${isUser ? avatarHtml : ''}
        `;

        // Tambahkan tombol copy ke blok kode
        if (!isUser) {
            row.querySelectorAll('pre').forEach(pre => {
                const btn = document.createElement('button');
                btn.className = 'code-copy-btn';
                btn.textContent = 'Salin';
                btn.addEventListener('click', () => {
                    const code = pre.querySelector('code')?.innerText || pre.innerText;
                    navigator.clipboard.writeText(code).then(() => {
                        btn.textContent = 'Tersalin! ✓';
                        setTimeout(() => { btn.textContent = 'Salin'; }, 2000);
                    });
                });
                pre.appendChild(btn);
            });
        }

        messagesList.appendChild(row);
    }

    // 6. Event Listeners & UI Helpers
    function setupEventListeners() {
        // Form kirim pesan
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendMessage();
        });

        // Shortcut Enter di textarea
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Tombol Obrolan Baru
        newChatBtn.addEventListener('click', () => {
            resetToNewChat();
        });

        // Prompt Saran di Welcome Screen
        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                if (prompt) {
                    messageInput.value = prompt;
                    sendMessage(prompt);
                }
            });
        });

        // Mobile Sidebar Toggles
        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', openSidebarMobile);
        }
        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', closeSidebarMobile);
        }
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeSidebarMobile);
        }

        // Modal Petunjuk Setup
        if (openInfoModalBtn) {
            openInfoModalBtn.addEventListener('click', () => infoModal.classList.add('open'));
        }
        if (closeInfoModalBtn) {
            closeInfoModalBtn.addEventListener('click', () => infoModal.classList.remove('open'));
        }
        if (modalUnderstandBtn) {
            modalUnderstandBtn.addEventListener('click', () => infoModal.classList.remove('open'));
        }
        if (infoModal) {
            infoModal.addEventListener('click', (e) => {
                if (e.target === infoModal) infoModal.classList.remove('open');
            });
        }

        // Theme Switcher Toggle
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', toggleTheme);
        }
    }

    function setupTextareaAutoResize() {
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = `${Math.min(messageInput.scrollHeight, 160)}px`;
        });
    }

    function openSidebarMobile() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
    }

    function closeSidebarMobile() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatTime(dateInput) {
        const d = new Date(dateInput);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
});
