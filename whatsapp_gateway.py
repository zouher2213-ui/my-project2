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
    instance_id = request.args.get('instanceId') or cfg.get('instanceId')
    token = request.args.get('token') or cfg.get('token')

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
    instance_id = request.args.get('instanceId') or cfg.get('instanceId')
    token = request.args.get('token') or cfg.get('token')

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

def send_single_media(instance_id, token, clean_phone, image_item, caption):
    """Sends an image (HTTP URL or Base64 Data URL) via Green API sendFileByUrl."""
    url_file = None

    # Case 1: Public HTTP/HTTPS URL
    if isinstance(image_item, str) and image_item.startswith('http'):
        url_file = image_item

    # Case 2: Base64 Data URL (data:image/...;base64,...)
    elif isinstance(image_item, str) and 'base64,' in image_item:
        try:
            base64_data = image_item.split('base64,')[1]
            img_bytes = base64.b64decode(base64_data)

            mime_type = "image/jpeg"
            ext = "jpg"
            if "data:image/png" in image_item:
                mime_type = "image/png"
                ext = "png"

            upload_url = f"https://api.green-api.com/waInstance{instance_id}/uploadFile/{token}"
            upload_resp = requests.post(
                upload_url,
                headers={"Content-Type": mime_type},
                data=img_bytes,
                timeout=15
            )
            if upload_resp.status_code == 200:
                url_file = upload_resp.json().get('urlFile')
            else:
                print("Green API uploadFile error:", upload_resp.status_code, upload_resp.text)
        except Exception as e:
            print("Error uploading base64 image:", e)

    if url_file:
        send_url = f"https://api.green-api.com/waInstance{instance_id}/sendFileByUrl/{token}"
        payload = {
            "chatId": f"{clean_phone}@c.us",
            "urlFile": url_file,
            "fileName": f"issue_photo.jpg",
            "caption": caption
        }
        send_resp = requests.post(send_url, json=payload, timeout=15)
        if send_resp.status_code == 200:
            return True, send_resp.json()
        else:
            print("sendFileByUrl response error:", send_resp.status_code, send_resp.text)

    return False, None

@app.route('/send-whatsapp', methods=['POST'])
def send_whatsapp():
    data = request.json or {}
    raw_phone = data.get('phone', '') or data.get('to', '')
    message = data.get('message', '') or data.get('body', '')
    
    # Collect images (array or single string)
    images_input = data.get('imageUrls', [])
    if not images_input and data.get('imageUrl'):
        images_input = [data.get('imageUrl')]
    elif isinstance(images_input, str):
        images_input = [images_input]

    cfg = load_config()
    instance_id = (data.get('instanceId') or cfg.get('instanceId', '')).strip()
    token = (data.get('token') or cfg.get('token', '')).strip()

    clean_phone = ''.join(filter(str.isdigit, str(raw_phone)))
    if clean_phone.startswith('05'):
        clean_phone = '966' + clean_phone[1:]
    elif clean_phone.startswith('5') and len(clean_phone) == 9:
        clean_phone = '966' + clean_phone

    if not instance_id or not token:
        return jsonify({'success': False, 'error': 'لم يتم تحديد Instance ID و Token الخاص بـ Green-API'}), 400

    try:
        media_sent_count = 0

        # Try sending images attached to ticket
        if images_input and len(images_input) > 0:
            for idx, img_item in enumerate(images_input):
                caption_text = message if idx == 0 else f"صورة مرفقة رقم ({idx + 1})"
                success, res_info = send_single_media(instance_id, token, clean_phone, img_item, caption_text)
                if success:
                    media_sent_count += 1

        # If media was sent successfully, return success!
        if media_sent_count > 0:
            return jsonify({'success': True, 'mediaSent': True, 'count': media_sent_count})

        # If no media sent, send text message via sendMessage
        url_msg = f"https://api.green-api.com/waInstance{instance_id}/sendMessage/{token}"
        payload_msg = {
            "chatId": f"{clean_phone}@c.us",
            "message": message
        }
        resp_msg = requests.post(url_msg, json=payload_msg, timeout=10)
        if resp_msg.status_code == 200:
            return jsonify({'success': True, 'data': resp_msg.json(), 'mediaSent': False})
        else:
            return jsonify({'success': False, 'error': f"Green-API response ({resp_msg.status_code}): {resp_msg.text}"}), resp_msg.status_code

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting WhatsApp Gateway Microservice on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000)
