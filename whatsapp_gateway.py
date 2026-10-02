import os
import json
import base64
import requests
from io import BytesIO
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import qrcode

app = Flask(__name__)
CORS(app)

CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'wa_config.json')

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {'instanceId': '', 'token': '', 'provider': 'green-api'}

def save_config(cfg):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)

@app.route('/config', methods=['GET', 'POST'])
def handle_config():
    if request.method == 'POST':
        data = request.json or {}
        cfg = load_config()
        cfg['instanceId'] = data.get('instanceId', cfg.get('instanceId', '')).strip()
        cfg['token'] = data.get('token', cfg.get('token', '')).strip()
        cfg['provider'] = data.get('provider', 'green-api').strip()
        save_config(cfg)
        return jsonify({'success': True, 'config': cfg})
    return jsonify(load_config())

@app.route('/qr', methods=['GET'])
def get_qr():
    cfg = load_config()
    instance_id = cfg.get('instanceId')
    token = cfg.get('token')

    if not instance_id or not token:
        qr_img = qrcode.make('https://green-api.com')
        buf = BytesIO()
        qr_img.save(buf, format='PNG')
        buf.seek(0)
        return send_file(buf, mimetype='image/png')

    try:
        url = f"https://api.green-api.com/waInstance{instance_id}/qr/{token}"
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            res_data = resp.json()
            if res_data.get('type') == 'qrCode' and res_data.get('message'):
                qr_base64 = res_data.get('message')
                if ',' in qr_base64:
                    qr_base64 = qr_base64.split(',')[1]
                img_bytes = base64.b64decode(qr_base64)
                return send_file(BytesIO(img_bytes), mimetype='image/png')
            elif res_data.get('type') == 'alreadyLogged':
                return jsonify({'status': 'authorized', 'message': 'Account already linked!'}), 200

        qr_img = qrcode.make(f"https://api.green-api.com/waInstance{instance_id}/qr/{token}")
        buf = BytesIO()
        qr_img.save(buf, format='PNG')
        buf.seek(0)
        return send_file(buf, mimetype='image/png')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/status', methods=['GET'])
def check_status():
    cfg = load_config()
    instance_id = cfg.get('instanceId')
    token = cfg.get('token')
    if not instance_id or not token:
        return jsonify({'status': 'unconfigured', 'authorized': False})
    
    try:
        url = f"https://api.green-api.com/waInstance{instance_id}/getStateInstance/{token}"
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            state = resp.json().get('stateInstance', 'notAuthorized')
            return jsonify({'status': state, 'authorized': state == 'authorized'})
    except Exception as e:
        pass
    return jsonify({'status': 'unknown', 'authorized': False})

@app.route('/send-whatsapp', methods=['POST'])
def send_whatsapp():
    data = request.json or {}
    raw_phone = data.get('phone', '') or data.get('to', '')
    message = data.get('message', '') or data.get('body', '')
    image_url = data.get('imageUrl', '') or data.get('mediaUrl', '')

    clean_phone = ''.join(filter(str.isdigit, str(raw_phone)))
    if clean_phone.startswith('05'):
        clean_phone = '966' + clean_phone[1:]
    elif clean_phone.startswith('5') and len(clean_phone) == 9:
        clean_phone = '966' + clean_phone

    cfg = load_config()
    instance_id = cfg.get('instanceId')
    token = cfg.get('token')

    if instance_id and token:
        try:
            # 1. If image URL is provided and is a valid HTTP URL, send media via sendFileByUrl
            if image_url and str(image_url).startswith('http'):
                url_media = f"https://api.green-api.com/waInstance{instance_id}/sendFileByUrl/{token}"
                payload_media = {
                    "chatId": f"{clean_phone}@c.us",
                    "urlFile": image_url,
                    "fileName": "issue_photo.jpg",
                    "caption": message
                }
                resp_media = requests.post(url_media, json=payload_media, timeout=12)
                if resp_media.status_code == 200:
                    return jsonify({'success': True, 'data': resp_media.json()})

            # 2. Otherwise send text message
            url = f"https://api.green-api.com/waInstance{instance_id}/sendMessage/{token}"
            payload = {
                "chatId": f"{clean_phone}@c.us",
                "message": message
            }
            resp = requests.post(url, json=payload, timeout=10)
            if resp.status_code == 200:
                return jsonify({'success': True, 'data': resp.json()})
            else:
                return jsonify({'success': False, 'error': resp.text}), resp.status_code
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    return jsonify({'success': False, 'error': 'API Gateway unconfigured'}), 400

if __name__ == '__main__':
    print("Starting WhatsApp Gateway Microservice on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000)
