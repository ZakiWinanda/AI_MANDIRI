/**
 * ChatGPT-Style App Logic
 * Clean, No Logo, No Brand, Centered Empty State
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── State ──────────────────────────────────────────────────────────────
    let activeConversationId = null;
    let conversations = [];
    let isGenerating = false;

    // ── DOM ────────────────────────────────────────────────────────────────
    const mainContent      = document.getElementById('mainContent');
    const chatContainer    = document.getElementById('chatContainer');
    const messagesList     = document.getElementById('messagesList');
    const welcomeScreen    = document.getElementById('welcomeScreen');
    const typingIndicator  = document.getElementById('typingIndicator');
    const chatForm         = document.getElementById('chatForm');
    const messageInput     = document.getElementById('messageInput');
    const sendBtn          = document.getElementById('sendBtn');
    const modelSelect      = document.getElementById('modelSelect');
    const activeChatTitle  = document.getElementById('activeChatTitle');
    const conversationsList= document.getElementById('conversationsList');
    const newChatBtn       = document.getElementById('newChatBtn');
    const sidebar          = document.getElementById('sidebar');
    const sidebarOverlay   = document.getElementById('sidebarOverlay');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const closeSidebarBtn  = document.getElementById('closeSidebarBtn');
    const openRouterIndicator  = document.getElementById('openRouterIndicator');
    const openRouterStatusText = document.getElementById('openRouterStatusText');
    const supabaseIndicator    = document.getElementById('supabaseIndicator');
    const supabaseStatusText   = document.getElementById('supabaseStatusText');

    // ── Marked Config (ChatGPT Codeblock Style) ───────────────────────────
    try {
        const renderer = new marked.Renderer();
        renderer.code = function(code, infostring) {
            const lang = (infostring || '').match(/\S*/)[0] || '';
            const displayLang = lang || 'code';
            const validLang = (lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang)) ? lang : '';
            let highlighted = '';

            if (validLang && typeof hljs !== 'undefined') {
                highlighted = hljs.highlight(code, { language: validLang }).value;
            } else if (typeof hljs !== 'undefined') {
                try {
                    highlighted = hljs.highlightAuto(code).value;
                } catch(e) {
                    highlighted = escapeHtml(code);
                }
            } else {
                highlighted = escapeHtml(code);
            }

            return `
<div class="code-block-wrapper">
    <div class="code-block-header">
        <span class="code-block-lang">${escapeHtml(displayLang)}</span>
        <button type="button" class="code-block-copy" aria-label="Salin kode">
            <svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copy-label">Salin kode</span>
        </button>
    </div>
    <div class="code-block-body">
        <pre><code class="hljs ${validLang ? 'language-' + validLang : ''}">${highlighted}</code></pre>
    </div>
</div>`;
        };

        marked.use({
            renderer: renderer,
            breaks: true,
            gfm: true
        });
    } catch(e) {}

    // ── Init ──────────────────────────────────────────────────────────────
    checkSystemStatus();
    loadConversations();
    setupEventListeners();
    setupTextareaAutoResize();

    // Pastikan status tombol kirim sesuai isi input
    updateSendButtonState();

    // ── System Status (Kiri Bawah) ─────────────────────────────────────────
    async function checkSystemStatus() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            const isOk = data.ai_configured ?? data.openrouter_configured;
            const name = data.provider || 'AI Provider';

            openRouterIndicator.className = 'status-indicator ' + (isOk ? 'online' : 'fallback');
            openRouterStatusText.textContent = isOk ? 'Aktif' : 'Nonaktif';

            supabaseIndicator.className = 'status-indicator ' + (data.supabase_configured ? 'online' : 'fallback');
            supabaseStatusText.textContent = data.supabase_configured ? 'Tersambung' : 'Lokal';
        } catch(err) {
            openRouterIndicator.className = 'status-indicator offline';
            openRouterStatusText.textContent = 'Offline';
            supabaseIndicator.className = 'status-indicator offline';
            supabaseStatusText.textContent = 'Offline';
        }
    }

    // ── Conversations ──────────────────────────────────────────────────────
    async function loadConversations() {
        try {
            const res = await fetch('/api/conversations');
            const data = await res.json();
            if (data.success) {
                conversations = data.conversations || [];
                renderConversationsList();
            }
        } catch(err) {
            conversationsList.innerHTML = '<div style="padding:1rem;font-size:0.78rem;color:var(--sidebar-text-muted);text-align:center">Belum ada riwayat</div>';
        }
    }

    function renderConversationsList() {
        if (!conversations.length) {
            conversationsList.innerHTML = '<div style="padding:0.8rem 0.5rem;font-size:0.78rem;color:var(--sidebar-text-muted);text-align:center">Belum ada riwayat</div>';
            return;
        }

        conversationsList.innerHTML = '';
        conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = 'conv-item' + (conv.id === activeConversationId ? ' active' : '');
            item.dataset.id = conv.id;

            item.innerHTML = `
                <div class="conv-title-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span class="conv-item-title">${escapeHtml(conv.title || 'Obrolan')}</span>
                </div>
                <button class="delete-conv-btn" title="Hapus" aria-label="Hapus obrolan">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;

            item.addEventListener('click', e => {
                if (e.target.closest('.delete-conv-btn')) return;
                switchConversation(conv.id, conv.title);
                closeSidebarMobile();
            });

            item.querySelector('.delete-conv-btn').addEventListener('click', e => {
                e.stopPropagation();
                deleteConversation(conv.id);
            });

            conversationsList.appendChild(item);
        });
    }

    async function switchConversation(convId, title) {
        if (activeConversationId === convId) return;
        activeConversationId = convId;
        activeChatTitle.textContent = title || '';
        renderConversationsList();

        mainContent.classList.remove('is-empty');
        welcomeScreen.style.display = 'none';
        messagesList.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.85rem">Memuat pesan...</div>';

        try {
            const res = await fetch(`/api/conversations/${convId}`);
            const data = await res.json();
            messagesList.innerHTML = '';
            if (data.success && data.messages && data.messages.length > 0) {
                data.messages.forEach(msg => appendMessageToUI(msg.role, msg.content, msg.created_at));
                scrollToBottom();
            } else {
                mainContent.classList.add('is-empty');
                welcomeScreen.style.display = 'flex';
            }
        } catch(err) {
            messagesList.innerHTML = '<div style="color:#ef4444;text-align:center;padding:1rem">Gagal memuat pesan</div>';
        }
    }

    async function deleteConversation(convId) {
        if (!confirm('Hapus obrolan ini?')) return;
        try {
            const res = await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                conversations = conversations.filter(c => c.id !== convId);
                if (activeConversationId === convId) resetToNewChat();
                else renderConversationsList();
            }
        } catch(err) {}
    }

    function resetToNewChat() {
        activeConversationId = null;
        activeChatTitle.textContent = '';
        messagesList.innerHTML = '';
        mainContent.classList.add('is-empty');
        welcomeScreen.style.display = 'flex';
        messageInput.value = '';
        messageInput.style.height = 'auto';
        updateSendButtonState();
        renderConversationsList();
        closeSidebarMobile();
        messageInput.focus();
    }

    // ── Send Message ────────────────────────────────────────────────────────
    async function sendMessage(text) {
        const message = (text || messageInput.value).trim();
        if (!message || isGenerating) return;

        isGenerating = true;
        sendBtn.disabled = true;

        mainContent.classList.remove('is-empty');
        welcomeScreen.style.display = 'none';

        appendMessageToUI('user', message);
        messageInput.value = '';
        messageInput.style.height = 'auto';
        updateSendButtonState();
        scrollToBottom();

        typingIndicator.style.display = 'flex';
        scrollToBottom();

        try {
            const payload = {
                message,
                conversation_id: activeConversationId,
                model: modelSelect.value
            };

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            typingIndicator.style.display = 'none';

            if (data.success) {
                if (!activeConversationId && data.conversation_id) {
                    activeConversationId = data.conversation_id;
                    const newTitle = message.substring(0, 30) + (message.length > 30 ? '...' : '');
                    activeChatTitle.textContent = newTitle;
                    await loadConversations();
                }
                appendMessageToUI('assistant', data.reply);
            } else {
                appendMessageToUI('assistant', `⚠️ **Terjadi Kesalahan:** ${data.error || 'Tidak dapat memproses pesan'}`);
            }
        } catch(err) {
            typingIndicator.style.display = 'none';
            appendMessageToUI('assistant', '❌ **Gagal terhubung:** Terjadi gangguan jaringan atau server.');
        } finally {
            isGenerating = false;
            updateSendButtonState();
            scrollToBottom();
            messageInput.focus();
        }
    }

    // ── Render Message ─────────────────────────────────────────────────────
    function appendMessageToUI(role, content, timestamp) {
        const row = document.createElement('div');
        row.className = `message-row ${role}`;

        const isUser = role === 'user';
        const timeStr = timestamp ? formatTime(timestamp) : formatTime(new Date());

        const avatarHtml = isUser
            ? `<div class="avatar user">Anda</div>`
            : `<div class="avatar ai">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 2v2"></path><path d="M12 20v2"></path>
                    <path d="m4.93 4.93 1.41 1.41"></path>
                    <path d="m17.66 17.66 1.41 1.41"></path>
                    <path d="M2 12h2"></path><path d="M20 12h2"></path>
                    <path d="m6.34 17.66-1.41 1.41"></path>
                    <path d="m19.07 4.93-1.41 1.41"></path>
                </svg>
               </div>`;

        let bubbleHtml = '';
        if (isUser) {
            bubbleHtml = `<div class="message-bubble">${escapeHtml(content)}</div>`;
        } else {
            let parsed = '';
            try { parsed = marked.parse(content); } catch(e) { parsed = escapeHtml(content); }
            bubbleHtml = `<div class="message-bubble">${parsed}</div>`;
        }

        row.innerHTML = `
            ${!isUser ? avatarHtml : ''}
            <div class="message-body">
                ${bubbleHtml}
                <span class="message-meta">${timeStr}</span>
            </div>
            ${isUser ? avatarHtml : ''}
        `;

        // Code block copy button & table scroll wrapper
        if (!isUser) {
            // Salin kode ChatGPT-style
            row.querySelectorAll('.code-block-copy').forEach(btn => {
                btn.addEventListener('click', () => {
                    const wrapper = btn.closest('.code-block-wrapper');
                    const code = wrapper ? wrapper.querySelector('code')?.innerText || '' : '';
                    navigator.clipboard.writeText(code).then(() => {
                        const label = btn.querySelector('.copy-label');
                        if (label) label.textContent = 'Tersalin!';
                        btn.classList.add('copied');
                        setTimeout(() => {
                            if (label) label.textContent = 'Salin kode';
                            btn.classList.remove('copied');
                        }, 2000);
                    });
                });
            });

            // Fallback untuk <pre> standar jika ada
            row.querySelectorAll('pre:not(.code-block-pre)').forEach(pre => {
                if (pre.closest('.code-block-wrapper')) return;
                const btn = document.createElement('button');
                btn.className = 'code-copy-btn';
                btn.textContent = 'Salin';
                btn.addEventListener('click', () => {
                    const code = pre.querySelector('code')?.innerText || pre.innerText;
                    navigator.clipboard.writeText(code).then(() => {
                        btn.textContent = 'Tersalin ✓';
                        setTimeout(() => { btn.textContent = 'Salin'; }, 2000);
                    });
                });
                pre.style.position = 'relative';
                pre.appendChild(btn);
            });

            // Bungkus setiap tabel agar bisa digeser ke kanan-kiri (horizontal scroll)
            row.querySelectorAll('table').forEach(table => {
                if (!table.parentElement.classList.contains('table-wrap')) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'table-wrap';
                    table.parentNode.insertBefore(wrapper, table);
                    wrapper.appendChild(table);
                }
            });
        }

        messagesList.appendChild(row);
    }

    // ── Event Listeners ─────────────────────────────────────────────────────
    function setupEventListeners() {
        chatForm.addEventListener('submit', e => { e.preventDefault(); sendMessage(); });
        messageInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
        newChatBtn.addEventListener('click', resetToNewChat);

        // Sidebar Nav items
        ['navGambar', 'navPustaka', 'navTerjadwal', 'navPlugin'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', () => resetToNewChat());
        });

        if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', openSidebarMobile);
        if (closeSidebarBtn)  closeSidebarBtn.addEventListener('click', closeSidebarMobile);
        if (sidebarOverlay)   sidebarOverlay.addEventListener('click', closeSidebarMobile);
    }

    function setupTextareaAutoResize() {
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = `${Math.min(messageInput.scrollHeight, 200)}px`;
            updateSendButtonState();
        });
    }

    function updateSendButtonState() {
        const hasText = messageInput.value.trim().length > 0;
        sendBtn.disabled = !hasText || isGenerating;
        if (hasText && !isGenerating) {
            sendBtn.classList.add('active');
        } else {
            sendBtn.classList.remove('active');
        }
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
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatTime(dateInput) {
        const d = new Date(dateInput);
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }

});
