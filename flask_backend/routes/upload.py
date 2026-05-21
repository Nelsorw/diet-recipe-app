import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required

upload_bp = Blueprint('upload', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_FILE_SIZE_MB   = 5


def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@upload_bp.route('/profile-image', methods=['POST'])
@jwt_required()
def upload_profile_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided. Use key "image".'}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400

    if not _allowed_file(file.filename):
        return jsonify({'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

    # check file size
    file.seek(0, os.SEEK_END)
    size_mb = file.tell() / (1024 * 1024)
    file.seek(0)
    if size_mb > MAX_FILE_SIZE_MB:
        return jsonify({'error': f'File too large. Max size is {MAX_FILE_SIZE_MB}MB.'}), 400

    # generate unique filename to avoid collisions
    ext      = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"

    upload_dir = os.path.join(current_app.root_path, 'static', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)

    file.save(os.path.join(upload_dir, filename))

    # Build URL dynamically so it works on any host (local IP, ngrok, production)
    host = request.host_url.rstrip('/')
    url = f"{host}/static/uploads/{filename}"
    return jsonify({'message': 'Image uploaded successfully.', 'url': url}), 201