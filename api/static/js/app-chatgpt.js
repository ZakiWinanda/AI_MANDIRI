/**
 * ChatGPT-Style App Logic
 * Clean UI, Multi-File Attachment (PDF, DOCX, XLSX, Code, Text, Images), Vision & Context
 */

document.addEventListener('DOMContentLoaded', () => {

    // ── State ──────────────────────────────────────────────────────────────
    let activeConversationId = null;
    let conversations = [];
    let isGenerating = false;
    let attachedFiles = []; // Array of { name, size, type, is_image, data_url, content }

    // ── DOM ────────────────────────────────────────────────────────────────
    const mainContent          = document.getElementById('mainContent');
    const chatContainer        = document.getElementById('chatContainer');
    const messagesList         = document.getElementById('messagesList');
    const welcomeScreen        = document.getElementById('welcomeScreen');
    const typingIndicator      = document.getElementById('typingIndicator');
    const chatForm             = document.getElementById('chatForm');
    const messageInput         = document.getElementById('messageInput');
    const sendBtn              = document.getElementById('sendBtn');
    const modelSelect          = document.getElementById('modelSelect');
    const activeChatTitle      = document.getElementById('activeChatTitle');
    const conversationsList    = document.getElementById('conversationsList');
    const newChatBtn           = document.getElementById('newChatBtn');
    const sidebar              = document.getElementById('sidebar');
    const sidebarOverlay       = document.getElementById('sidebarOverlay');
    const toggleSidebarBtn     = document.getElementById('toggleSidebarBtn');
    const closeSidebarBtn      = document.getElementById('closeSidebarBtn');
    const openRouterIndicator  = document.getElementById('openRouterIndicator');
    const openRouterStatusText = document.getElementById('openRouterStatusText');
    const supabaseIndicator    = document.getElementById('supabaseIndicator');
    const supabaseStatusText   = document.getElementById('supabaseStatusText');
    const plusBtn              = document.getElementById('plusBtn');
    const attachBtn            = document.getElementById('attachBtn');
    const fileUploadInput      = document.getElementById('fileUploadInput');
    const attachedFilesWrapper = document.getElementById('attachedFilesWrapper');
    const chatInputWrapper     = document.getElementById('chatInputWrapper');

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
    updateSendButtonState();

    // ── System Status (Kiri Bawah) ─────────────────────────────────────────
    async function checkSystemStatus() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            const isOk = data.ai_configured ?? data.openrouter_configured;

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
        attachedFiles = [];
        renderAttachedFiles();
        updateSendButtonState();
        renderConversationsList();
        closeSidebarMobile();
        messageInput.focus();
    }

    // ── File Upload & Parsing Engine ────────────────────────────────────────
    async function handleFilesSelected(fileList) {
        if (!fileList || fileList.length === 0) return;

        for (const file of Array.from(fileList)) {
            try {
                const parsed = await extractFileContent(file);
                if (parsed) {
                    attachedFiles.push(parsed);
                }
            } catch(err) {
                console.error('Gagal membaca berkas:', err);
                attachedFiles.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    is_image: false,
                    content: `[Berkas ${file.name} gagal dibaca: ${err.message}]`
                });
            }
        }

        renderAttachedFiles();
        updateSendButtonState();
    }

    async function extractFileContent(file) {
        const ext = file.name.split('.').pop().toLowerCase();

        // 1. Gambar (Vision)
        if (file.type.startsWith('image/')) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    is_image: true,
                    data_url: e.target.result,
                    content: `[Lampiran Gambar: ${file.name}]`
                });
                reader.readAsDataURL(file);
            });
        }

        // 2. Dokumen PDF
        if (ext === 'pdf' || file.type === 'application/pdf') {
            if (typeof pdfjsLib !== 'undefined') {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let fullText = '';
                    const maxPages = Math.min(pdf.numPages, 50);
                    for (let i = 1; i <= maxPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += `\n--- Halaman ${i} ---\n` + pageText;
                    }
                    return {
                        name: file.name,
                        size: file.size,
                        type: 'application/pdf',
                        is_image: false,
                        content: fullText.trim() || '[Dokumen PDF kosong atau berupa pindaian gambar]'
                    };
                } catch(e) {
                    console.warn('PDF.js parsing gagal, fallback', e);
                }
            }
        }

        // 3. Dokumen Word (.docx)
        if (ext === 'docx') {
            if (typeof mammoth !== 'undefined') {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    return {
                        name: file.name,
                        size: file.size,
                        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        is_image: false,
                        content: result.value.trim()
                    };
                } catch(e) {
                    console.warn('Mammoth docx parsing gagal, fallback', e);
                }
            }
        }

        // 4. Dokumen Excel / Spreadsheet (.xlsx, .xls, .csv)
        if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
            if (typeof XLSX !== 'undefined') {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                    let sheetTexts = [];
                    workbook.SheetNames.forEach(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        const csv = XLSX.utils.sheet_to_csv(sheet);
                        sheetTexts.push(`[Lembar: ${sheetName}]\n` + csv);
                    });
                    return {
                        name: file.name,
                        size: file.size,
                        type: file.type || 'text/csv',
                        is_image: false,
                        content: sheetTexts.join('\n\n')
                    };
                } catch(e) {
                    console.warn('XLSX parsing gagal, fallback', e);
                }
            }
        }

        // 5. Berkas Teks & Kode Pemrograman (.py, .js, .html, .css, .json, .txt, .md, .sql, .xml, .yaml, dll)
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    name: file.name,
                    size: file.size,
                    type: file.type || 'text/plain',
                    is_image: false,
                    content: e.target.result
                });
            };
            reader.onerror = () => {
                resolve({
                    name: file.name,
                    size: file.size,
                    type: file.type || 'application/octet-stream',
                    is_image: false,
                    content: `[Berkas biner: ${file.name} (${file.size} bytes)]`
                });
            };
            reader.readAsText(file);
        });
    }

    function renderAttachedFiles() {
        if (!attachedFiles.length) {
            attachedFilesWrapper.innerHTML = '';
            attachedFilesWrapper.style.display = 'none';
            return;
        }

        attachedFilesWrapper.style.display = 'flex';
        attachedFilesWrapper.innerHTML = '';

        attachedFiles.forEach((file, index) => {
            const chip = document.createElement('div');
            chip.className = 'attached-file-chip';

            const ext = file.name.split('.').pop().toUpperCase() || 'FILE';
            const iconHtml = file.is_image && file.data_url
                ? `<img src="${file.data_url}" alt="${escapeHtml(file.name)}" class="file-chip-thumb">`
                : `<div class="file-chip-icon">${escapeHtml(ext.substring(0, 4))}</div>`;

            chip.innerHTML = `
                ${iconHtml}
                <div class="file-chip-info">
                    <span class="file-chip-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
                    <span class="file-chip-size">${formatFileSize(file.size)}</span>
                </div>
                <button type="button" class="file-chip-remove" title="Hapus berkas" aria-label="Hapus">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;

            chip.querySelector('.file-chip-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                attachedFiles.splice(index, 1);
                renderAttachedFiles();
                updateSendButtonState();
            });

            attachedFilesWrapper.appendChild(chip);
        });
    }

    function formatFileSize(bytes) {
        if (!bytes || isNaN(bytes)) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ── Send Message ────────────────────────────────────────────────────────
    async function sendMessage(text) {
        const rawMessage = (text || messageInput.value).trim();
        const filesToSend = [...attachedFiles];

        if (!rawMessage && filesToSend.length === 0) return;
        if (isGenerating) return;

        isGenerating = true;
        sendBtn.disabled = true;

        mainContent.classList.remove('is-empty');
        welcomeScreen.style.display = 'none';

        // Tampilkan pesan user di UI dengan pratinjau lampiran
        appendUserMessageWithAttachments(rawMessage, filesToSend);

        // Reset input dan chip lampiran
        messageInput.value = '';
        messageInput.style.height = 'auto';
        attachedFiles = [];
        renderAttachedFiles();
        updateSendButtonState();
        scrollToBottom();

        typingIndicator.style.display = 'flex';
        scrollToBottom();

        try {
            const payload = {
                message: rawMessage,
                files: filesToSend,
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
                    const displayTitle = rawMessage || (filesToSend.length > 0 ? `Berkas: ${filesToSend[0].name}` : 'Obrolan');
                    const newTitle = displayTitle.substring(0, 30) + (displayTitle.length > 30 ? '...' : '');
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

    // ── Render User Message with Attachments ────────────────────────────────
    function appendUserMessageWithAttachments(message, files) {
        let contentHtml = '';

        if (files && files.length > 0) {
            contentHtml += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">';
            files.forEach(f => {
                if (f.is_image && f.data_url) {
                    contentHtml += `<div><img src="${f.data_url}" alt="${escapeHtml(f.name)}" class="chat-image-preview"></div>`;
                } else {
                    const ext = f.name.split('.').pop().toUpperCase() || 'FILE';
                    contentHtml += `
                        <div class="attached-file-chip" style="background:var(--main-bg);box-shadow:none;">
                            <div class="file-chip-icon">${escapeHtml(ext.substring(0, 4))}</div>
                            <div class="file-chip-info">
                                <span class="file-chip-name">${escapeHtml(f.name)}</span>
                                <span class="file-chip-size">${formatFileSize(f.size)}</span>
                            </div>
                        </div>
                    `;
                }
            });
            contentHtml += '</div>';
        }

        if (message) {
            contentHtml += `<div style="white-space:pre-wrap;">${escapeHtml(message)}</div>`;
        } else if (files && files.length > 0) {
            contentHtml += `<div style="font-size:0.85rem;color:var(--text-muted);font-style:italic;">[Melampirkan ${files.length} berkas]</div>`;
        }

        const row = document.createElement('div');
        row.className = 'message-row user';
        const timeStr = formatTime(new Date());

        row.innerHTML = `
            <div class="avatar user">Anda</div>
            <div class="message-body">
                <div class="message-bubble">${contentHtml}</div>
                <span class="message-meta">${timeStr}</span>
            </div>
        `;

        messagesList.appendChild(row);
    }

    // ── Render AI Response ─────────────────────────────────────────────────
    function appendMessageToUI(role, content, timestamp) {
        if (role === 'user') {
            // Untuk history reload
            const row = document.createElement('div');
            row.className = 'message-row user';
            const timeStr = timestamp ? formatTime(timestamp) : formatTime(new Date());
            let parsedUser = '';
            try { parsedUser = marked.parse(content); } catch(e) { parsedUser = escapeHtml(content); }

            row.innerHTML = `
                <div class="avatar user">Anda</div>
                <div class="message-body">
                    <div class="message-bubble">${parsedUser}</div>
                    <span class="message-meta">${timeStr}</span>
                </div>
            `;
            messagesList.appendChild(row);
            return;
        }

        const row = document.createElement('div');
        row.className = `message-row ${role}`;
        const timeStr = timestamp ? formatTime(timestamp) : formatTime(new Date());

        const avatarHtml = `<div class="avatar ai">
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
        try { bubbleHtml = marked.parse(content); } catch(e) { bubbleHtml = escapeHtml(content); }

        row.innerHTML = `
            ${avatarHtml}
            <div class="message-body">
                <div class="message-bubble">${bubbleHtml}</div>
                <span class="message-meta">${timeStr}</span>
            </div>
        `;

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

        // Bungkus tabel agar bisa digeser horizontal
        row.querySelectorAll('table').forEach(table => {
            if (!table.parentElement.classList.contains('table-wrap')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-wrap';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });

        messagesList.appendChild(row);
    }

    // ── Event Listeners ─────────────────────────────────────────────────────
    function setupEventListeners() {
        chatForm.addEventListener('submit', e => { e.preventDefault(); sendMessage(); });
        messageInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
        newChatBtn.addEventListener('click', resetToNewChat);

        // Upload berkas via tombol + atau ikon lampiran
        if (plusBtn) plusBtn.addEventListener('click', () => fileUploadInput.click());
        if (attachBtn) attachBtn.addEventListener('click', () => fileUploadInput.click());

        fileUploadInput.addEventListener('change', (e) => {
            handleFilesSelected(e.target.files);
            fileUploadInput.value = '';
        });

        // Drag & Drop berkas langsung ke area input atau layar
        window.addEventListener('dragover', (e) => e.preventDefault());
        window.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFilesSelected(e.dataTransfer.files);
            }
        });

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
        const canSend = messageInput.value.trim().length > 0 || attachedFiles.length > 0;
        sendBtn.disabled = !canSend || isGenerating;
        if (canSend && !isGenerating) {
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
