# 🚀 Quick Start Guide

## Choose Your Method

### 🌐 Web Interface (Easiest - Recommended for Most Users)

**Windows:**
1. Double-click `start_web.bat`
2. Your browser will show the interface
3. Drag & drop your files and convert!

**Mac/Linux:**
1. Double-click `start_web.sh`
2. Open http://localhost:5000 in your browser
3. Drag & drop your files and convert!

**Manual Start:**
```bash
python web_app.py
```
Then visit: http://localhost:5000

---

### 💻 Command Line Interface

**Basic conversion:**
```bash
python laser_converter.py photo.jpg --output-type svg --use-case photos
```

**Batch processing:**
```bash
python laser_converter.py *.png *.jpg --output-type svg --use-case signage
```

**High DPI output:**
```bash
python laser_converter.py design.svg --output-type png --dpi 600
```

**Show help:**
```bash
python laser_converter.py --help
```

---

### 📦 Create Executable for Friends

**Build once, share everywhere:**
```bash
python build_exe.py
```

This creates `dist/LaserConverter.exe` that you can:
- Copy to USB drive
- Share via cloud storage
- Email to friends
- No Python needed on their computer!

**To use the .exe:**
1. Copy `LaserConverter.exe` to any Windows computer
2. Double-click it
3. Wait for server to start
4. Open browser to http://localhost:5000
5. Start converting!

---

## Access from Phone/Tablet

1. Start the web server on your computer
2. Find your computer's IP address:
   - Windows: Open Command Prompt, type `ipconfig`, look for IPv4
   - Mac: System Preferences > Network
   - Linux: Type `ifconfig` or `ip addr`
3. On your phone/tablet (on same WiFi):
   - Open browser
   - Go to: http://YOUR_IP:5000
   - Example: http://192.168.1.100:5000

---

## Common Use Cases

### Converting Photos for Wood Engraving
```bash
# Web: Upload JPG, select "PNG" output, "Photos" use case
# CLI:
python laser_converter.py family_photo.jpg --output-type png --dpi 600 --use-case photos
```

### Logo for Acrylic Signage
```bash
# Web: Upload PNG/SVG, select "SVG" output, "Signage" use case
# CLI:
python laser_converter.py logo.png --output-type svg --use-case signage
```

### Jewelry Design
```bash
# Web: Upload design file, select "SVG" output, "Jewelry" use case
# CLI:
python laser_converter.py earring.svg --output-type svg --use-case jewelry
```

### Personalized Gifts
```bash
# Web: Upload image, select output format, "Personalization" use case
# CLI:
python laser_converter.py name_design.dxf --output-type svg --use-case personalization
```

---

## Troubleshooting

### "Module not found" error
```bash
pip install -r requirements.txt
```

### Port 5000 already in use
```bash
# Change port in web_app.py, line at bottom:
app.run(host='0.0.0.0', port=5000)  # Change 5000 to 5001 or any available port
```

### Can't access from other devices
- Check firewall settings
- Ensure all devices on same WiFi network
- Use your computer's actual IP, not "localhost"

---

## What to Do Next

1. **Try the web interface** - It's the easiest way!
2. **Read WEB_GUIDE.md** - Complete web interface documentation
3. **Read USAGE.md** - Detailed CLI usage and workflows
4. **Read README.md** - Full feature list and technical details
5. **Show best practices** - Click the button in web interface
6. **Share with friends** - Build the .exe and share!

---

## Support

- 🐛 Found a bug? Open an issue on GitHub
- 💡 Have an idea? Submit a feature request
- ❓ Need help? Check the documentation files
- 🤝 Want to contribute? Pull requests welcome!

---

**Happy Laser Engraving! 🔥**
