#!/usr/bin/env python3
"""
Flask web application for laser engraving file converter.
Provides a web interface accessible from any device for file conversion.
"""

import os
import uuid
import time
import zipfile
from datetime import datetime, timedelta
from flask import Flask, render_template, request, send_file, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import converter_core

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['OUTPUT_FOLDER'] = os.path.join(os.path.dirname(__file__), 'outputs')
app.config['SECRET_KEY'] = os.urandom(24)

# Create folders if they don't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {
    'svg', 'dxf', 'ai', 'eps',  # Vector formats
    'png', 'jpg', 'jpeg', 'bmp', 'tiff', 'tif'  # Raster formats
}


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def cleanup_old_files():
    """Remove files older than 1 hour."""
    current_time = time.time()
    for folder in [app.config['UPLOAD_FOLDER'], app.config['OUTPUT_FOLDER']]:
        for filename in os.listdir(folder):
            filepath = os.path.join(folder, filename)
            if os.path.isfile(filepath):
                if current_time - os.path.getmtime(filepath) > 3600:  # 1 hour
                    try:
                        os.remove(filepath)
                    except Exception:
                        pass


@app.route('/')
def index():
    """Main page with upload interface."""
    return render_template('index.html')


@app.route('/api/use-cases')
def get_use_cases():
    """Get available use cases."""
    use_cases = list(converter_core.MATERIAL_SUGGESTIONS['svg'].keys())
    return jsonify({'use_cases': use_cases})


@app.route('/api/best-practices')
def get_best_practices():
    """Get best practices for laser engraving."""
    practices = converter_core.get_best_practices()
    return jsonify({'practices': practices})


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload."""
    cleanup_old_files()
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not supported'}), 400
    
    # Generate unique filename
    original_filename = secure_filename(file.filename)
    unique_id = str(uuid.uuid4())[:8]
    filename = f"{unique_id}_{original_filename}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    # Save file
    file.save(filepath)
    
    # Detect file type
    try:
        file_type = converter_core.detect_file_type(filepath)
    except ValueError as e:
        os.remove(filepath)
        return jsonify({'error': str(e)}), 400
    
    return jsonify({
        'success': True,
        'filename': filename,
        'original_filename': original_filename,
        'file_type': file_type,
        'unique_id': unique_id
    })




@app.route('/api/convert-multi', methods=['POST'])
def convert_file_multi():
    """Handle multi-format file conversion - generates all recommended formats."""
    data = request.json
    
    if not data or 'filename' not in data:
        return jsonify({'error': 'No filename provided'}), 400
    
    filename = data['filename']
    use_case = data.get('use_case', 'general')
    
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    if not os.path.exists(input_path):
        return jsonify({'error': 'File not found'}), 404
    
    # Convert file to all formats
    result = converter_core.convert_file_multi_format(
        input_path,
        use_case=use_case,
        verbose=False
    )
    
    if not result['success']:
        return jsonify({'error': result['error']}), 500
    
    # Move converted files to output folder and prepare response
    unique_id = filename.split('_')[0]
    base_name = '_'.join(filename.split('_')[1:])
    base_name = os.path.splitext(base_name)[0]
    
    outputs_info = {}
    for format_key, output_data in result['outputs'].items():
        # Determine file extension
        if 'svg' in format_key:
            ext = 'svg'
        else:
            ext = 'png'
        
        # Create output filename
        format_suffix = format_key.replace('_', '')  # e.g., 'png300'
        output_filename = f"{unique_id}_{base_name}_{format_suffix}.{ext}"
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
        
        # Move file
        import shutil
        if output_data['path'] != output_path:
            shutil.move(output_data['path'], output_path)
        
        # Get file size
        file_size = os.path.getsize(output_path)
        file_size_mb = round(file_size / (1024 * 1024), 2)
        
        outputs_info[format_key] = {
            'filename': output_filename,
            'format': output_data['format'],
            'description': output_data['description'],
            'file_size': file_size,
            'file_size_mb': file_size_mb,
            'material_suggestion': output_data['suggestion']
        }
    
    return jsonify({
        'success': True,
        'file_type': result['file_type'],
        'outputs': outputs_info
    })


@app.route('/api/download-all/<unique_id>', methods=['GET'])
def download_all_files(unique_id):
    """Create and download a ZIP file containing all converted files."""
    # Find all files with this unique_id in the output folder
    output_files = []
    for filename in os.listdir(app.config['OUTPUT_FOLDER']):
        if filename.startswith(unique_id + '_'):
            output_files.append(filename)
    
    if not output_files:
        return jsonify({'error': 'No files found'}), 404
    
    # Create ZIP file
    zip_filename = f"{unique_id}_all_formats.zip"
    zip_path = os.path.join(app.config['OUTPUT_FOLDER'], zip_filename)
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for filename in output_files:
            if not filename.endswith('.zip'):  # Don't include old zip files
                filepath = os.path.join(app.config['OUTPUT_FOLDER'], filename)
                # Add file to ZIP with clean name (remove unique ID)
                clean_name = '_'.join(filename.split('_')[1:])
                zipf.write(filepath, clean_name)
    
    return send_file(
        zip_path,
        as_attachment=True,
        download_name='laser_engraving_all_formats.zip',
        mimetype='application/zip'
    )


@app.route('/api/convert', methods=['POST'])
def convert_file():
    """Handle file conversion."""
    data = request.json
    
    if not data or 'filename' not in data:
        return jsonify({'error': 'No filename provided'}), 400
    
    filename = data['filename']
    output_type = data.get('output_type', 'svg')
    dpi = int(data.get('dpi', 300))
    threshold = int(data.get('threshold', 128))
    use_case = data.get('use_case', 'general')
    
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    if not os.path.exists(input_path):
        return jsonify({'error': 'File not found'}), 404
    
    # Generate output filename
    unique_id = filename.split('_')[0]
    base_name = '_'.join(filename.split('_')[1:])
    base_name = os.path.splitext(base_name)[0]
    output_filename = f"{unique_id}_{base_name}_converted.{output_type}"
    output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
    
    # Convert file
    result = converter_core.convert_file(
        input_path,
        output_type=output_type,
        dpi=dpi,
        threshold=threshold,
        use_case=use_case,
        verbose=False
    )
    
    if not result['success']:
        return jsonify({'error': result['error']}), 500
    
    # Move converted file to output folder
    if result['output_path'] != output_path:
        import shutil
        shutil.move(result['output_path'], output_path)
    
    # Get file size
    file_size = os.path.getsize(output_path)
    file_size_mb = round(file_size / (1024 * 1024), 2)
    
    return jsonify({
        'success': True,
        'output_filename': output_filename,
        'file_type': result['file_type'],
        'material_suggestion': result['material_suggestion'],
        'file_size': file_size,
        'file_size_mb': file_size_mb
    })


@app.route('/api/download/<filename>')
def download_file(filename):
    """Download converted file with proper MIME types and clean filenames."""
    filename = secure_filename(filename)
    filepath = os.path.join(app.config['OUTPUT_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    
    # Determine MIME type based on file extension
    ext = os.path.splitext(filename)[1].lower()
    mime_types = {
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg'
    }
    mime_type = mime_types.get(ext, 'application/octet-stream')
    
    # Create a clean, user-friendly download filename
    # Remove the unique ID prefix for cleaner downloads
    parts = filename.split('_', 1)
    if len(parts) > 1:
        clean_filename = parts[1]  # Remove unique ID
    else:
        clean_filename = filename
    
    return send_file(
        filepath,
        as_attachment=True,
        download_name=clean_filename,
        mimetype=mime_type
    )


@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})


# Machine Control Endpoints
@app.route('/api/machines/scan', methods=['GET'])
def scan_machines():
    """Scan for connected laser engraving machines."""
    try:
        import machine_control
        machines = machine_control.scan_for_machines()
        return jsonify({
            'success': True,
            'machines': machines,
            'count': len(machines)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'machines': [],
            'count': 0
        })


@app.route('/api/machines/connect', methods=['POST'])
def connect_machine():
    """Connect to a specific machine."""
    data = request.json
    
    if not data or 'port' not in data:
        return jsonify({'error': 'No port specified'}), 400
    
    port = data['port']
    baudrate = data.get('baudrate', 115200)
    
    try:
        import machine_control
        controller = machine_control.get_controller()
        success = controller.connect(port, baudrate)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Connected to {port}',
                'port': port
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to connect'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/machines/disconnect', methods=['POST'])
def disconnect_machine():
    """Disconnect from active machine."""
    try:
        import machine_control
        controller = machine_control.get_controller()
        controller.disconnect()
        
        return jsonify({
            'success': True,
            'message': 'Disconnected'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/machines/status', methods=['GET'])
def get_machine_status():
    """Get current machine status."""
    try:
        import machine_control
        controller = machine_control.get_controller()
        status = controller.get_status()
        
        if status:
            return jsonify({
                'success': True,
                'status': status.value,
                'connected': controller.active_connection is not None
            })
        else:
            return jsonify({
                'success': True,
                'status': 'disconnected',
                'connected': False
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/machines/send-gcode', methods=['POST'])
def send_gcode_to_machine():
    """Generate G-code from file and send directly to connected machine."""
    data = request.json
    
    if not data or 'filename' not in data:
        return jsonify({'error': 'No filename provided'}), 400
    
    filename = data['filename']
    work_area = data.get('work_area', [300, 200])
    power = data.get('power', 800)
    speed = data.get('speed', 1000)
    
    # Get file path
    filepath = os.path.join(app.config['OUTPUT_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    
    try:
        import machine_control
        import gcode_generator
        
        # Check if machine is connected
        controller = machine_control.get_controller()
        if not controller.active_connection:
            return jsonify({
                'error': 'No machine connected. Please connect first.'
            }), 400
        
        # Generate G-code
        gcode_path = os.path.join(
            app.config['OUTPUT_FOLDER'],
            os.path.splitext(filename)[0] + '.gcode'
        )
        
        gcode_generator.generate_gcode_from_file(
            filepath,
            gcode_path,
            work_area=tuple(work_area),
            power=power,
            speed=speed
        )
        
        # Send to machine
        success = controller.send_gcode_file(gcode_path)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'G-code sent to machine successfully',
                'gcode_file': os.path.basename(gcode_path)
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to send G-code to machine'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/machines/control', methods=['POST'])
def control_machine():
    """Control machine operations (pause, resume, stop, home)."""
    data = request.json
    
    if not data or 'action' not in data:
        return jsonify({'error': 'No action specified'}), 400
    
    action = data['action']
    
    try:
        import machine_control
        controller = machine_control.get_controller()
        
        if not controller.active_connection:
            return jsonify({'error': 'No machine connected'}), 400
        
        result = False
        
        if action == 'pause':
            result = controller.pause()
        elif action == 'resume':
            result = controller.resume()
        elif action == 'stop':
            result = controller.stop()
        elif action == 'home':
            result = controller.home()
        elif action == 'emergency_stop':
            result = controller.emergency_stop()
        else:
            return jsonify({'error': f'Unknown action: {action}'}), 400
        
        if result:
            return jsonify({
                'success': True,
                'message': f'Action {action} executed'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to execute {action}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/machines/send-command', methods=['POST'])
def send_command():
    """Send raw G-code command to machine."""
    data = request.json
    
    if not data or 'command' not in data:
        return jsonify({'error': 'No command provided'}), 400
    
    command = data['command']
    
    try:
        import machine_control
        controller = machine_control.get_controller()
        
        if not controller.active_connection:
            return jsonify({'error': 'No machine connected'}), 400
        
        response = controller.send_command(command)
        
        return jsonify({
            'success': True,
            'response': response
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    print("="*70)
    print("Laser Engraving File Converter - Web Interface")
    print("WITH DIRECT MACHINE CONTROL")
    print("="*70)
    print("\nStarting web server...")
    print("Access the application at: http://localhost:5000")
    print("\nFeatures:")
    print("  ✓ File conversion (SVG, PNG, DXF, etc.)")
    print("  ✓ Multi-format output")
    print("  ✓ Machine detection (USB/Serial)")
    print("  ✓ Direct G-code sending")
    print("  ✓ Machine control (Start/Stop/Pause)")
    print("\nPress Ctrl+C to stop the server")
    print("="*70)
    
    # For production deployment, set debug=False
    # For development, you can set debug=True
    import os
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    port = int(os.environ.get('PORT', 5000))
    
    if debug_mode:
        print("\n⚠️  WARNING: Debug mode is enabled. Use only for development!")
        print("   Set FLASK_DEBUG=False for production deployment.")
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
