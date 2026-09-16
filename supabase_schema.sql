-- ==============================================================================
-- Skrip Setup Database Supabase untuk AI Chat Application
-- Buka Dashboard Supabase Anda -> Masuk ke Menu "SQL Editor" -> Buat Query baru,
-- Paste kode di bawah ini lalu klik tombol "Run".
-- ==============================================================================

-- 1. Buat Tabel Percakapan (Conversations)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'Percakapan Baru',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Buat Tabel Pesan (Messages)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tambahkan Index untuk mempercepat query berdasarkan conversation_id dan waktu
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- 4. Pengaturan Row Level Security (RLS)
-- Untuk aplikasi personal sederhana menggunakan Anon Key, kita izinkan operasi publik:
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses publik penuh conversations" ON conversations
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Akses publik penuh messages" ON messages
    FOR ALL
    USING (true)
    WITH CHECK (true);
