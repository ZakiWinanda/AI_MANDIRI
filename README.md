# 🤖 NovaAI - Personal AI Assistant (Flask + OpenRouter + Supabase + Vercel)

Aplikasi asisten AI personal modern berbasis Python **Flask**, ditenagai oleh **OpenRouter API** (mendukung model gratis maupun berbayar), database cloud **Supabase** untuk menyimpan riwayat percakapan, dan dioptimasi agar siap dideploy ke **Vercel Serverless**.

---

## ✨ Fitur Utama

- ⚡ **Backend Ringan & Cepat**: Dibangun dengan Python Flask dan arsitektur serverless.
- 🧠 **Multi-Model AI (OpenRouter)**: Bebas memilih model seperti Llama 3.3 70B, DeepSeek R1, Gemini 2.0 Flash, Claude 3.5, atau GPT-4o.
- 💾 **Penyimpanan Cloud (Supabase)**: Riwayat percakapan tersimpan otomatis di cloud PostgreSQL Supabase.
- 🛡️ **In-Memory Fallback**: Tetap bisa dijalankan dan dites secara lokal meskipun kunci Supabase belum diisi.
- 🎨 **UI Modern & Estetik**: Tema Dark Mode eksklusif, glassmorphism, rendering Markdown dengan syntax highlighting, dan responsif untuk layar HP/desktop.
- 🚀 **Siap Deploy ke Vercel**: Dilengkapi dengan `vercel.json` dan struktur folder sesuai standar Vercel Python Runtime.

---

## 📁 Struktur Proyek

```text
TES AI/
├── api/
│   └── index.py            # Entry point Flask (kompatibel lokal & Vercel)
├── templates/
│   └── index.html          # Halaman antarmuka chat
├── static/
│   ├── css/
│   │   └── style.css       # Desain UI dark mode & animasi
│   └── js/
│       └── app.js          # Logika interaksi frontend & API
├── supabase_schema.sql     # Skrip database untuk Supabase SQL Editor
├── .env.example            # Template variabel lingkungan
├── requirements.txt        # Dependensi Python
├── vercel.json             # Konfigurasi routing Vercel
└── README.md               # Panduan dokumentasi
```

---

## 🚀 Panduan Menjalankan di Komputer Lokal

### 1. Prasyarat
- Python 3.9+ terpasang di komputer Anda.

### 2. Instalasi Dependensi
Buka terminal/PowerShell di direktori proyek ini, lalu jalankan:

```powershell
# (Opsional tapi disarankan) Buat virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependensi
pip install -r requirements.txt
```

### 3. Konfigurasi File `.env`
Salin file `.env.example` menjadi `.env`:
```powershell
cp .env.example .env
```
Buka `.env` dan masukkan API Key:
- Dapatkan **OpenRouter API Key** di [openrouter.ai/keys](https://openrouter.ai/keys).
- Dapatkan **Supabase URL & Anon Key** di [supabase.com](https://supabase.com).

### 4. Menjalankan Server
```powershell
python api/index.py
```
Buka browser Anda dan akses: **`http://127.0.0.1:5000`**

---

## 🗄️ Setup Database Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan buat project baru.
2. Masuk ke tab **SQL Editor** di sidebar kiri.
3. Buka file `supabase_schema.sql` di proyek ini, salin seluruh isinya, dan tempel ke SQL Editor Supabase.
4. Klik tombol **Run**. Tabel `conversations` dan `messages` akan otomatis terbuat beserta indeks dan permission-nya.
5. Masuk ke **Project Settings > API**, lalu salin:
   - **Project URL** -> masukkan ke `SUPABASE_URL`
   - **Project API Keys (anon public)** -> masukkan ke `SUPABASE_KEY`

---

## 🌐 Panduan Deploy ke Vercel

Ada dua cara mudah untuk men-deploy aplikasi ini ke Vercel:

### Opsi A: Lewat GitHub (Paling Direkomendasikan)
1. Buat repository baru di GitHub dan push folder proyek ini ke repository tersebut:
   ```bash
   git init
   git add .
   git commit -m "Initial commit NovaAI"
   git branch -M main
   git remote add origin https://github.com/username-anda/nova-ai.git
   git push -u origin main
   ```
2. Buka dashboard [Vercel](https://vercel.com) dan klik **Add New... > Project**.
3. Pilih repository GitHub Anda lalu klik **Import**.
4. Di bagian **Environment Variables**, tambahkan:
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL` (misal: `meta-llama/llama-3.3-70b-instruct:free`)
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
5. Klik **Deploy**. Dalam beberapa detik aplikasi AI pribadi Anda sudah online dan dapat diakses dari mana saja!

### Opsi B: Lewat Vercel CLI
```powershell
# Install Vercel CLI jika belum ada
npm install -g vercel

# Login dan deploy
vercel
```
Saat diminta menambahkan Environment Variables di Vercel CLI atau dashboard Vercel, masukkan variabel dari `.env` Anda.
