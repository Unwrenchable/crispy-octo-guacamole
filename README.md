# 🎮 Improved Enigma - Multi-Purpose Platform

This repository contains **TWO APPLICATIONS**:

## 1. 🎮 Bar Trivia - Multiplayer Quiz Platform (NEW!)

A real-time multiplayer trivia quiz platform perfect for bars, pubs, and game nights!

**[📖 Read the complete Trivia Platform Guide →](README_TRIVIA.md)**

### Features
- **Real-time multiplayer gameplay** using Socket.io
- **Team-based competition** 
- **QR Code joining** for easy access
- **Progressive Web App (PWA)** support
- **Host dashboard** optimized for TV/projector
- **Mobile-friendly** player interface

### Quick Start
```bash
# Start both backend and frontend
./start-trivia.sh        # Linux/Mac
start-trivia.bat         # Windows

# Or manually:
cd backend && npm install && npm start    # Port 3001
cd frontend && npm install && npm run dev  # Port 5173
```

### Screenshots

**Home Page:**

![Home Page](https://github.com/user-attachments/assets/fe2323ed-cedd-439f-9396-fd53a3694f40)

**Host Lobby with QR Code:**

![Host Lobby](https://github.com/user-attachments/assets/fef69749-a158-4d32-87b1-725cf8ba2654)

**Player Join:**

![Player Join](https://github.com/user-attachments/assets/2aa08f20-3b9c-441b-96f7-d6a74ffab13b)

---

## 2. 🔥 Laser Engraving File Converter (Original)

# 🔥 ALL-IN-ONE Laser Engraving Application

**Convert files AND engrave directly - complete laser engraving solution with direct machine control!**

A comprehensive tool for converting multiple file formats to scalable, high-definition files suitable for laser engraving, with intelligent material suggestions AND **direct machine control** - send G-code straight to your connected engraver!

**✨ NEW: Direct Machine Control! Connect to your laser engraver via USB/Serial and engrave with one click!**

![Web Interface](https://github.com/user-attachments/assets/c35bab72-f733-4378-a1fd-bb6ca9bc4e24)

## 🎯 What Makes This Special

This is a **TRUE ALL-IN-ONE APPLICATION** that eliminates the need for multiple programs:

### Before (Traditional Workflow)
1. Convert file in one program
2. Download converted file
3. Open LightBurn/LaserGRBL
4. Import file
5. Connect to machine
6. Send to machine

### Now (All-in-One Workflow)
1. **Upload file** to web interface
2. **Convert** with one click
3. **Click "Engrave Now"** - Done! ✨

## 🚀 Key Features

### 🎨 File Conversion
- **Multiple Input Formats**: SVG, DXF, AI, EPS, PNG, JPG, BMP, TIFF
- **High-Quality Output**: SVG for precise vector work or high-resolution PNG (300+ DPI)
- **Multi-Format Mode**: Generate all recommended formats at once (SVG + PNG at 300/600/1200 DPI)
- **Material Suggestions**: Research-backed material recommendations
- **Best Practices**: Built-in guidelines for successful laser engraving

### 🔌 **Direct Machine Control** ⭐ NEW!
- **Auto-Detection**: Automatically finds USB/Serial AND Bluetooth laser engravers
- **Bluetooth Support**: YES! Wireless control of Bluetooth-enabled engravers (xTool, LaserPecker, NEJE, etc.)
- **One-Click Connect**: Connect to your machine instantly (wired or wireless)
- **G-code Generation**: Converts files to machine-ready G-code
- **Direct Sending**: Streams G-code directly to your engraver
- **Real-time Control**: Start, stop, pause, resume operations
- **Status Monitoring**: Live machine status updates
- **Emergency Stop**: Safety controls always available

### 🖥️ Multi-Platform Access
- **Web Interface**: Modern, responsive UI - use from any device
- **Command Line**: Full CLI for advanced users and automation
- **Standalone Executable**: Create .exe to share with friends (no Python needed)
- **Network Access**: Use from phone, tablet, or any device on your network

### 🔒 Privacy & Security
- **All Local Processing**: No cloud uploads, everything stays on your machine
- **Machine Safety**: Emergency stop, pause controls, warnings
- **Secure Communication**: Direct serial connection to your engraver

## Installation

### Prerequisites

1. **Python 3.7+**: Make sure Python is installed on your system
2. **ImageMagick** (optional): Required for AI/EPS file conversion
   - Ubuntu/Debian: `sudo apt-get install imagemagick`
   - macOS: `brew install imagemagick`
   - Windows: Download from [imagemagick.org](https://imagemagick.org/script/download.php)

### Install Dependencies

```bash
pip install -r requirements.txt
```

**Key dependencies:**
- `Pillow` - Image processing
- `svgwrite` - SVG creation
- `Flask` - Web interface
- `pyserial` - Machine control (USB/Serial)
- `pybluez` - Bluetooth support (optional - only needed for Bluetooth engravers)
- `pyinstaller` - Create executables

**Optional Bluetooth Setup:**
If you have Bluetooth laser engravers (xTool M1, LaserPecker, NEJE, etc.):
```bash
pip install pybluez
```

See [BLUETOOTH_GUIDE.md](BLUETOOTH_GUIDE.md) for detailed Bluetooth setup instructions.

## 🚀 Quick Start - All-in-One Workflow

### Convert & Engrave in 3 Steps:

**Step 1: Start the web interface**
```bash
python web_app.py
# Open: http://localhost:5000
```

**Step 2: Convert your file**
1. Drag & drop your file (SVG, PNG, JPG, etc.)
2. Choose output format and use case
3. Click "🔥 INITIATE CONVERSION"

**Step 3: Engrave directly**
1. Click "🔍 SCAN FOR MACHINES"
2. Connect to your engraver
3. Adjust power/speed settings
4. Click "⚡ ENGRAVE NOW"

That's it! Your file is converted and engraving automatically. No need to switch between programs!

### Just Convert (No Machine)

If you only want to convert files:

**Web Interface:**
```bash
python web_app.py
```
Convert files through the browser, download results.

**Command Line:**
```bash
python laser_converter.py photo.jpg --output-type svg --use-case photos
```

### Share with Friends

Create a standalone executable:
```bash
python build_exe.py
# Creates: dist/LaserConverter.exe
# Share the .exe - no Python needed!
```

```bash
pip install -r requirements.txt
```

## 🌟 Access Methods

Choose your preferred way to use the converter:

### 1. 🌐 Web Interface with Machine Control (Recommended)
- **Beautiful modern UI** with drag-and-drop upload
- **Works on any device** - desktop, tablet, phone
- **Direct machine control** - connect and engrave with one click
- **Real-time conversion** with material suggestions
- **Machine detection** - automatically finds connected engravers
- **Live status monitoring** - see what your machine is doing
- **Access from anywhere** on your network

**Quick Start:**
```bash
python web_app.py
# Then open: http://localhost:5000
```

Or use the easy launchers:
- Windows: Double-click `start_web.bat`
- Mac/Linux: Double-click `start_web.sh`

[📖 Read the complete Web Interface Guide →](WEB_GUIDE.md)
[🔌 Read the Machine Control Guide →](MACHINE_CONTROL_GUIDE.md)

### 2. 💻 Command Line Interface
- Full CLI functionality for advanced users
- Perfect for batch processing and automation
- Integration with scripts and workflows

[📖 Read the CLI Usage Guide →](USAGE.md)

### 3. 📦 Standalone Executable
- Create a `.exe` file to share with friends
- No Python installation required
- Just double-click and run!

```bash
python build_exe.py
# Creates: dist/LaserConverter.exe
```

## 🔌 Supported Machines

The machine control feature works with:

**USB/Serial Engravers:**
- ✅ **GRBL-based engravers** (K40, NEJE, Ortur, EleksMaker, generic CNC)
- ✅ **Marlin firmware** (3D printers with laser attachments)
- ✅ **Smoothieware** (Smoothieboard-based systems)
- ✅ **USB/Serial connections** (CH340, FTDI, Arduino)

**Bluetooth Engravers:** 🔵 NEW!
- ✅ **xTool M1** - Bluetooth + USB + WiFi
- ✅ **LaserPecker series** (L1, L2, LP3, LP4) - Primary Bluetooth
- ✅ **NEJE Master 2S Plus** - Bluetooth capable
- ✅ **AtomStack** (select models) - Bluetooth enabled
- ✅ **Ortur Laser Master 3** - Bluetooth support
- ✅ **Portable/mini engravers** - Many support Bluetooth

**See [BLUETOOTH_GUIDE.md](BLUETOOTH_GUIDE.md) for complete Bluetooth setup and usage.**

## 📋 Complete Feature List

### File Conversion
- Vector formats: SVG, DXF, AI, EPS
- Raster formats: PNG, JPG, BMP, TIFF
- Multi-format output (all formats at once)
- Custom DPI settings (100-1200)
- Material suggestions by use case
- Best practices guide

### Machine Control ⭐ NEW
- Automatic device detection (USB/Serial AND Bluetooth)
- Bluetooth wireless connection (xTool, LaserPecker, NEJE, etc.)
- One-click connection
- G-code generation from files
- Direct streaming to machine
- Real-time status monitoring
- Operation controls (start/stop/pause/resume)
- Emergency stop button
- Home machine command
- Custom power/speed settings
- Work area configuration

### User Interface
- Modern industrial-themed web UI
- Drag-and-drop file upload
- Mobile responsive design
- Real-time conversion progress
- Download to Downloads folder
- Machine status indicators
- Multi-language G-code support

## Usage

### Basic Examples

Convert a JPG to SVG for vector engraving:
```bash
python laser_converter.py photo.jpg --output-type svg --use-case photos
```

Convert a DXF design to high-resolution PNG:
```bash
python laser_converter.py design.dxf --output-type png --dpi 600
```

Process multiple files for signage:
```bash
python laser_converter.py logo.png design.svg --output-type svg --use-case signage
```

### Command-Line Options

```
positional arguments:
  input_files           Input file path(s) - supports SVG, DXF, AI, EPS, PNG, JPG, BMP, TIFF

optional arguments:
  -h, --help            Show help message and exit
  --output-type {svg,png}
                        Output format: svg (vector) or png (raster) - default: svg
  --use-case USE_CASE   Use case for material suggestions - default: general
  --dpi DPI             DPI for PNG output (minimum 300 recommended) - default: 300
  --threshold THRESHOLD
                        Threshold for raster-to-vector tracing (0-255) - default: 128
  --best-practices      Show best practices for laser engraving
```

### Use Cases

The program provides material suggestions for these use cases:
- `signage` - Signs, displays, wayfinding
- `jewelry` - Earrings, pendants, accessories
- `personalization` - Custom gifts, names, dates
- `photos` - Photo engraving, portraits
- `general` - All-purpose engraving
- `industrial` - Part marking, labels
- `arts` - Artistic projects, decorative items

## Output Formats

### SVG (Vector)
- **Best for**: Precise lines, cuts, and shapes
- **Advantages**: Infinitely scalable, small file size, clean cuts
- **Recommended for**: Logos, text, geometric designs
- **Materials**: Wood, acrylic, leather, anodized aluminum

### PNG (Raster)
- **Best for**: Photo engraving, shading, gradients
- **Advantages**: Supports grayscale, detailed images
- **Recommended for**: Photographs, complex artwork with shading
- **Materials**: Wood, slate, ceramic, leather

## Material Recommendations

The program provides intelligent material suggestions based on your output format and use case. Examples:

| Use Case | SVG Output | PNG Output |
|----------|------------|------------|
| Signage | Acrylic or plywood | Wood or MDF |
| Photos | Not ideal (use PNG) | Wood, slate, or ceramic |
| Jewelry | Anodized aluminum | Not recommended (use SVG) |
| Personalization | Leather or wood | Slate or leather |

## Best Practices

Run with `--best-practices` flag to see complete guidelines. Key points:

1. **Resolution**: Use 300+ DPI for raster images (600 DPI for fine detail)
2. **Scale**: Work at 1:1 scale in your design
3. **Testing**: ALWAYS test on scrap material first
4. **Safety**: Never use PVC (releases toxic chlorine gas when cut)
5. **Vectors**: Remove overlapping paths to prevent double-cutting
6. **Materials**: Start with basswood - forgiving and affordable

## Technical Details

### File Conversions

- **DXF → SVG**: Converts lines, circles, and arcs using ezdxf
- **AI/EPS → SVG**: Uses ImageMagick via Wand library
- **Raster → SVG**: Simple threshold-based tracing (consider Potrace for production)
- **SVG → PNG**: High-DPI rasterization using cairosvg
- **Raster → PNG**: DPI optimization and format standardization

### Dependencies

- **Pillow**: Image processing and raster handling
- **svgwrite**: SVG creation and editing
- **cairosvg**: SVG to PNG conversion
- **ezdxf**: DXF file parsing and conversion
- **Wand**: AI/EPS handling (requires ImageMagick)

## Limitations & Notes

1. **Raster-to-Vector Tracing**: The built-in tracing is basic. For production work, use dedicated tools like:
   - Potrace: Command-line bitmap tracing
   - Inkscape: GUI with trace bitmap feature
   - Adobe Illustrator: Image Trace feature

2. **AI/EPS Files**: Require ImageMagick installed separately

3. **Large Files**: Very large raster images may create huge SVG files when traced

4. **Complex Vectors**: DXF conversion supports basic entities (lines, circles, arcs). Complex curves may need manual review.

## Workflow Integration

This tool prepares files for laser engraving software:
1. Convert and optimize files with this tool
2. Import results into laser control software:
   - **LightBurn** (recommended)
   - **Inkscape** (free, open source)
   - **LaserGRBL** (for GRBL-based systems)
3. Adjust laser settings (power, speed, passes)
4. Test on scrap material
5. Engrave final piece

## Research & References

Material and technique recommendations are based on:
- Industry best practices from laser engraving professionals
- Material safety guidelines (xometry.com)
- Resolution and scaling requirements (heatsign.com)
- Community tutorials and case studies (YouTube laser engraving channels)

## License

MIT License - Feel free to use and modify for your projects

## Contributing

Contributions welcome! Areas for improvement:
- Advanced vectorization algorithms (integrate Potrace)
- Support for additional file formats
- GUI interface using Tkinter or web-based with Flask
- Preset profiles for common laser engravers
- Material database expansion

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
