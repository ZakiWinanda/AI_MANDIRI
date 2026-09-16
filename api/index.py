import os
import json
import datetime
import uuid
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load file .env jika ada
load_dotenv(override=True)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE_DIR = os.path.join(BASE_DIR, 'templates')
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(
    __name__,
    template_folder=TEMPLATE_DIR,
    static_folder=STATIC_DIR,
    static_url_path='/static'
)
app.secret_key = os.getenv('SECRET_KEY', 'default-ai-assistant-secret-key-2026')

# Konfigurasi AI Provider (9Router / OpenRouter)
AI_API_KEY = os.getenv('AI_API_KEY') or os.getenv('OPENROUTER_API_KEY', '')
AI_MODEL = os.getenv('AI_MODEL') or os.getenv('OPENROUTER_MODEL', 'ANTIGRAVITY_MODEL')
AI_BASE_URL = os.getenv('AI_BASE_URL') or os.getenv('OPENROUTER_BASE_URL', 'https://rx75sem.abc-tunnel.us/v1')

# Konfigurasi Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')


class SupabaseClient:
    """Client REST langsung ke Supabase PostgREST (ringan, cepat & tanpa konflik library)."""
    def __init__(self, url, key):
        self.base_url = url.rstrip('/') + '/rest/v1'
        self.headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }

    def list_conversations(self):
        try:
            r = requests.get(f"{self.base_url}/conversations?order=updated_at.desc", headers=self.headers, timeout=10)
            return r.json() if r.status_code == 200 else []
        except Exception as e:
            print(f"[Supabase List Error]: {e}")
            return []

    def create_conversation(self, conv_id, title, created_at, updated_at):
        payload = {'id': conv_id, 'title': title, 'created_at': created_at, 'updated_at': updated_at}
        try:
            r = requests.post(f"{self.base_url}/conversations", headers=self.headers, json=payload, timeout=10)
            data = r.json() if r.status_code in (200, 201) else []
            return data[0] if data else payload
        except Exception as e:
            print(f"[Supabase Create Conv Error]: {e}")
            return payload

    def get_messages(self, conv_id, limit=None):
        url = f"{self.base_url}/messages?conversation_id=eq.{conv_id}&order=created_at.asc"
        if limit:
            url += f"&limit={limit}"
        try:
            r = requests.get(url, headers=self.headers, timeout=10)
            return r.json() if r.status_code == 200 else []
        except Exception as e:
            print(f"[Supabase Get Messages Error]: {e}")
            return []

    def save_message(self, msg_record):
        try:
            r = requests.post(f"{self.base_url}/messages", headers=self.headers, json=msg_record, timeout=10)
            return r.status_code in (200, 201)
        except Exception as e:
            print(f"[Supabase Save Message Error]: {e}")
            return False

    def delete_conversation(self, conv_id):
        try:
            r = requests.delete(f"{self.base_url}/conversations?id=eq.{conv_id}", headers=self.headers, timeout=10)
            return r.status_code in (200, 204)
        except Exception as e:
            print(f"[Supabase Delete Conv Error]: {e}")
            return False

    def update_conversation_timestamp(self, conv_id, updated_at):
        try:
            r = requests.patch(
                f"{self.base_url}/conversations?id=eq.{conv_id}",
                headers=self.headers,
                json={'updated_at': updated_at},
                timeout=10
            )
            return r.status_code in (200, 204)
        except Exception as e:
            print(f"[Supabase Update Timestamp Error]: {e}")
            return False


# Inisialisasi Supabase
supabase_client = None
if SUPABASE_URL and SUPABASE_KEY and SUPABASE_KEY.startswith('eyJ'):
    try:
        supabase_client = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"[Supabase Init Warning]: {e}")
        supabase_client = None

# In-memory storage fallback jika Supabase belum aktif
in_memory_conversations = {}
in_memory_messages = {}


def get_conversation_history(conv_id, limit=12):
    """Mengambil riwayat percakapan untuk konteks prompt AI."""
    if supabase_client:
        return supabase_client.get_messages(conv_id, limit=limit)
    return in_memory_messages.get(conv_id, [])


@app.route('/')
def home():
    """Halaman utama aplikasi web."""
    return render_template('index.html', 
        has_ai_key=bool(AI_API_KEY),
        has_supabase=bool(supabase_client),
        default_model=AI_MODEL,
        base_url=AI_BASE_URL
    )


@app.route('/api/status', methods=['GET'])
def check_status():
    """Cek status konfigurasi API dan Database."""
    is_9router = "20128" in AI_BASE_URL or "localhost" in AI_BASE_URL or "tunnel" in AI_BASE_URL or "ANTIGRAVITY" in AI_MODEL
    provider_name = '9Router (Tunnel)' if 'tunnel' in AI_BASE_URL else ('9Router (Lokal)' if is_9router else 'OpenRouter (Cloud)')
    return jsonify({
        'ai_configured': bool(AI_API_KEY and not AI_API_KEY.startswith('sk-or-v1-xxxx')),
        'provider': provider_name,
        'supabase_configured': bool(supabase_client),
        'active_model': AI_MODEL,
        'base_url': AI_BASE_URL,
        'mode': 'database' if supabase_client else 'in_memory_fallback'
    })


@app.route('/api/conversations', methods=['GET'])
def list_conversations():
    """Mengambil seluruh daftar sesi percakapan."""
    if supabase_client:
        data = supabase_client.list_conversations()
        return jsonify({'success': True, 'conversations': data})

    # Fallback in-memory
    conv_list = sorted(in_memory_conversations.values(), key=lambda x: x['updated_at'], reverse=True)
    return jsonify({'success': True, 'conversations': conv_list})


@app.route('/api/conversations', methods=['POST'])
def create_conversation():
    """Membuat sesi percakapan baru."""
    data = request.get_json() or {}
    title = data.get('title', 'Percakapan Baru').strip() or 'Percakapan Baru'
    new_id = str(uuid.uuid4())
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if supabase_client:
        created = supabase_client.create_conversation(new_id, title, now_iso, now_iso)
        return jsonify({'success': True, 'conversation': created})

    item = {'id': new_id, 'title': title, 'created_at': now_iso, 'updated_at': now_iso}
    in_memory_conversations[new_id] = item
    in_memory_messages[new_id] = []
    return jsonify({'success': True, 'conversation': item})


@app.route('/api/conversations/<conv_id>', methods=['GET'])
def get_conversation_messages(conv_id):
    """Mengambil seluruh pesan dari satu sesi percakapan."""
    if supabase_client:
        msgs = supabase_client.get_messages(conv_id)
        return jsonify({'success': True, 'messages': msgs})

    msgs = in_memory_messages.get(conv_id, [])
    return jsonify({'success': True, 'messages': msgs})


@app.route('/api/conversations/<conv_id>', methods=['DELETE'])
def delete_conversation(conv_id):
    """Menghapus sesi percakapan dan pesan-pesannya."""
    if supabase_client:
        supabase_client.delete_conversation(conv_id)
        return jsonify({'success': True, 'message': 'Percakapan berhasil dihapus'})

    in_memory_conversations.pop(conv_id, None)
    in_memory_messages.pop(conv_id, None)
    return jsonify({'success': True, 'message': 'Percakapan berhasil dihapus'})


@app.route('/api/chat', methods=['POST'])
def chat():
    """Endpoint utama untuk bertukar pesan dengan AI via 9Router / OpenRouter."""
    data = request.get_json() or {}
    user_message = data.get('message', '').strip()
    conv_id = data.get('conversation_id')
    custom_model = data.get('model') or AI_MODEL
    system_prompt = data.get('system_prompt') or (
        "Kamu adalah asisten AI yang cerdas, sopan, ramah, dan sangat membantu. "
        "Gunakan format Markdown jika menyajikan penjelasan atau kode pemrograman."
    )

    if not user_message:
        return jsonify({'success': False, 'error': 'Pesan tidak boleh kosong'}), 400

    # 1. Pastikan conversation_id valid atau buat yang baru
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if not conv_id:
        conv_id = str(uuid.uuid4())
        first_title = user_message[:35] + ('...' if len(user_message) > 35 else '')
        if supabase_client:
            supabase_client.create_conversation(conv_id, first_title, now_iso, now_iso)
        else:
            in_memory_conversations[conv_id] = {
                'id': conv_id,
                'title': first_title,
                'created_at': now_iso,
                'updated_at': now_iso
            }
            in_memory_messages[conv_id] = []

    # 2. Ambil konteks riwayat obrolan terdahulu
    history = get_conversation_history(conv_id, limit=10)
    messages_payload = [{'role': 'system', 'content': system_prompt}]
    for msg in history:
        messages_payload.append({
            'role': msg['role'],
            'content': msg['content']
        })
    messages_payload.append({'role': 'user', 'content': user_message})

    # 3. Simpan pesan User terlebih dahulu ke Database
    user_msg_record = {
        'id': str(uuid.uuid4()),
        'conversation_id': conv_id,
        'role': 'user',
        'content': user_message,
        'created_at': now_iso
    }
    if supabase_client:
        supabase_client.save_message(user_msg_record)
    else:
        in_memory_messages.setdefault(conv_id, []).append(user_msg_record)

    # 4. Hubungi 9Router / OpenRouter API
    api_key = AI_API_KEY
    if not api_key or api_key.startswith('sk-or-v1-xxxx'):
        reply_content = (
            "⚠️ **API Key belum dikonfigurasi.**\n\n"
            "Silakan periksa file `.env` dan pastikan `AI_API_KEY` terisi."
        )
    else:
        try:
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            }
            payload = {
                'model': custom_model,
                'messages': messages_payload,
                'temperature': 0.7,
                'max_tokens': 2048,
                'stream': False
            }
            endpoint_url = f"{AI_BASE_URL.rstrip('/')}/chat/completions"
            resp = requests.post(
                endpoint_url,
                headers=headers,
                json=payload,
                timeout=60
            )
            resp.encoding = 'utf-8'

            if resp.status_code == 200:
                raw_text = resp.text.strip()
                if raw_text.startswith('data:'):
                    collected = []
                    for line in raw_text.splitlines():
                        line = line.strip()
                        if line.startswith('data:') and not line.endswith('[DONE]'):
                            try:
                                chunk = json.loads(line[5:].strip())
                                delta = chunk.get('choices', [{}])[0].get('delta', {})
                                content_part = delta.get('content', '')
                                if content_part:
                                    collected.append(content_part)
                            except Exception:
                                pass
                    reply_content = "".join(collected) if collected else "Respons AI kosong."
                else:
                    result_json = resp.json()
                    choices = result_json.get('choices', [])
                    if choices and 'message' in choices[0]:
                        reply_content = choices[0]['message'].get('content', '')
                    else:
                        reply_content = "Maaf, AI tidak memberikan respons yang dapat dibaca."
            else:
                err_body = resp.text
                reply_content = (
                    f"⚠️ **Error dari API ({resp.status_code})**\n\n"
                    f"Detail: `{err_body}`"
                )
        except requests.exceptions.Timeout:
            reply_content = "⏱️ Request ke AI mengalami timeout. Silakan coba lagi."
        except Exception as ex:
            reply_content = f"❌ Terjadi kendala saat menghubungi AI: {str(ex)}"

    # 5. Simpan balasan AI ke Database
    assistant_now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    assistant_msg_record = {
        'id': str(uuid.uuid4()),
        'conversation_id': conv_id,
        'role': 'assistant',
        'content': reply_content,
        'created_at': assistant_now_iso
    }

    if supabase_client:
        supabase_client.save_message(assistant_msg_record)
        supabase_client.update_conversation_timestamp(conv_id, assistant_now_iso)
    else:
        in_memory_messages.setdefault(conv_id, []).append(assistant_msg_record)
        if conv_id in in_memory_conversations:
            in_memory_conversations[conv_id]['updated_at'] = assistant_now_iso

    return jsonify({
        'success': True,
        'reply': reply_content,
        'conversation_id': conv_id,
        'role': 'assistant'
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"Server berjalan di http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
