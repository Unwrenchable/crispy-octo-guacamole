# Machine Control Guide - Direct Laser Engraver Connection

## Overview

The Laser Engraving File Converter now includes **DIRECT MACHINE CONTROL** capabilities, making it a complete all-in-one solution. You can now convert files AND send them directly to your connected laser engraver!

## Features

### 🔍 Machine Detection
- Automatically scans for USB/Serial connected laser engravers
- Identifies machine type (GRBL, Marlin, Smoothieware, etc.)
- Displays machine information (port, description, serial number)

### 🔌 Direct Connection
- One-click connection to your machine
- Configurable baud rate (default: 115200)
- Real-time connection status monitoring

### ⚡ G-code Generation
- **From SVG:** Converts vector paths to G-code for cutting/engraving
- **From PNG:** Converts raster images to G-code for photo engraving
- Adjustable parameters:
  - Laser power (0-1000)
  - Speed (mm/min)
  - Work area dimensions

### 🎮 Machine Control
- **Start:** Send G-code and begin engraving
- **Pause:** Temporarily stop (feed hold)
- **Resume:** Continue from pause
- **Stop:** Soft stop (completes current move)
- **Emergency Stop:** Immediate halt
- **Home:** Send machine to home position

### 📊 Status Monitoring
- Real-time machine status display
- Visual indicators:
  - 🟢 Green = IDLE (ready)
  - 🟠 Orange = RUNNING (engraving)
  - 🟡 Yellow = PAUSED
  - 🔴 Red = ERROR/ALARM
- Automatic status updates every 2 seconds

## Supported Machines

### ✅ Confirmed Compatible
- **GRBL-based engravers:**
  - K40 Laser Engravers
  - NEJE Laser Engravers
  - Ortur Laser Master
  - EleksMaker
  - Generic GRBL controllers
  
- **Marlin-based:**
  - 3D printers with laser attachments
  - Creality printers with laser modules
  
- **Smoothieware:**
  - Smoothieboard-based systems

### 🔌 Connection Types
- ✅ USB (via Serial - CH340, FTDI, Arduino)
- ✅ Direct Serial (RS-232)
- ✅ **Bluetooth** (YES! It's real and supported - see [BLUETOOTH_GUIDE.md](BLUETOOTH_GUIDE.md))

### 🔵 Bluetooth Support

**Yes, Bluetooth laser engravers are a real thing!** Many desktop and portable engravers include Bluetooth connectivity. This app supports them!

**Popular Bluetooth models:**
- LaserPecker series (L1, L2, LP3, LP4)
- xTool M1
- NEJE Master 2S Plus
- AtomStack (some models)
- Many portable/mini engravers

**To use Bluetooth engravers:**
1. Install optional Bluetooth support: `pip install pybluez`
2. Pair your engraver via OS Bluetooth settings
3. Scan for machines in the app
4. Connect wirelessly!

**See the complete guide**: [BLUETOOTH_GUIDE.md](BLUETOOTH_GUIDE.md) for setup instructions, troubleshooting, and best practices.

## How to Use

### Step 1: Install Dependencies

**Required (USB/Serial):**
```bash
pip install pyserial
```

**Optional (Bluetooth):**
```bash
# Only if you have Bluetooth engravers
pip install pybluez
```

### Step 2: Start the Web App

```bash
python web_app.py
```

Access at: http://localhost:5000

### Step 3: Connect Your Machine

1. **Connect** your laser engraver via USB cable
2. **Click** "🔍 SCAN FOR MACHINES"
3. **Select** your machine from the list
4. **Click** "🔌 CONNECT"

### Step 4: Prepare Your File

1. **Upload** your file (SVG, PNG, DXF, etc.)
2. **Convert** to desired format
3. **Review** material suggestions

### Step 5: Configure Settings

Adjust engraving parameters:
- **Power:** 0-1000 (higher = more power)
- **Speed:** 100-5000 mm/min (lower = slower/deeper)
- **Work Area:** Match your machine's dimensions

### Step 6: Send to Machine

1. **Review** the warning message
2. **Click** "⚡ ENGRAVE NOW"
3. **Monitor** the progress
4. Use controls if needed (pause/resume/stop)

## Safety Guidelines

### ⚠️ Before Starting

- ✅ Ensure materials are properly secured
- ✅ Focus is correctly set
- ✅ Laser safety glasses are worn
- ✅ Area is clear of flammable materials
- ✅ Ventilation is adequate

### During Operation

- 👀 Monitor the engraving process
- 🛑 Emergency stop button is always available
- ⏸️ Pause if anything looks wrong
- 🔥 Keep fire extinguisher nearby

### ❌ Never Use On

- PVC (releases toxic chlorine gas)
- Vinyl
- Polycarbonate (some types)
- Unknown plastics

## Machine Settings

### Power Settings (S parameter)

```
0-250:   Very light marking
250-500: Light engraving
500-750: Medium depth
750-900: Deep engraving
900-1000: Cutting (depending on material)
```

### Speed Settings (F parameter)

```
Fast (2000-5000 mm/min):  Light marking, thin lines
Medium (1000-2000 mm/min): Standard engraving
Slow (100-1000 mm/min):   Deep engraving, cutting
```

**General Rule:** Lower speed + higher power = deeper engraving

## G-code Commands Reference

The system uses standard G-code commands:

### Machine Control
- `$H` - Home machine
- `!` - Feed hold (pause)
- `~` - Cycle start (resume)
- `Ctrl-X` - Soft reset (stop)
- `?` - Status query

### Laser Control
- `M3` - Laser on (PWM mode)
- `M5` - Laser off
- `S###` - Set laser power (0-1000)

### Movement
- `G0` - Rapid positioning (laser off)
- `G1` - Linear move (laser on)
- `G2/G3` - Arc moves
- `F###` - Set feed rate (speed)

## Troubleshooting

### Machine Not Detected

**Problem:** No machines found when scanning

**Solutions:**
1. Check USB cable connection
2. Ensure machine is powered on
3. Install correct drivers (CH340/FTDI)
4. Try different USB port
5. Check device manager (Windows) or `ls /dev/tty*` (Linux/Mac)

### Connection Failed

**Problem:** Cannot connect to detected machine

**Solutions:**
1. Close other programs using the serial port (e.g., Arduino IDE, Pronterface)
2. Try different baud rate (115200, 57600, 38400, 9600)
3. Restart the machine
4. Restart the computer
5. Check user permissions for serial port access

### G-code Not Sending

**Problem:** File converts but won't send to machine

**Solutions:**
1. Check machine connection status
2. Ensure machine is in IDLE state
3. Clear any alarm states (may need to home machine)
4. Check G-code file was generated successfully
5. Try sending a simple command manually

### Machine In Alarm State

**Problem:** Machine shows ALARM status (red indicator)

**Solutions:**
1. **Soft Reset:** Click "STOP" button
2. **Home Machine:** Click "🏠 HOME MACHINE"
3. **Manual Reset:** Power cycle the machine
4. Check for mechanical issues (endstops, limit switches)

## Advanced Features

### Custom G-code Commands

You can send raw G-code commands via the API:

```bash
curl -X POST http://localhost:5000/api/machines/send-command \
  -H "Content-Type: application/json" \
  -d '{"command": "$H"}'
```

### Work Area Calibration

1. Set work area to match your machine:
   - Common K40: 300mm x 200mm
   - Common NEJE: 255mm x 255mm
   - Ortur Laser Master 2: 400mm x 430mm

2. Test with a small design first

3. Adjust as needed

## API Endpoints

For integration with other software:

- `GET /api/machines/scan` - Scan for machines
- `POST /api/machines/connect` - Connect to machine
- `POST /api/machines/disconnect` - Disconnect
- `GET /api/machines/status` - Get status
- `POST /api/machines/send-gcode` - Send G-code file
- `POST /api/machines/control` - Control operations
- `POST /api/machines/send-command` - Send raw command

## Tips & Best Practices

### For Best Results

1. **Start with low power** and increase gradually
2. **Test on scrap material** first
3. **Clean lenses** regularly for consistent power
4. **Use proper focus** for your material thickness
5. **Multiple passes** are better than one too-powerful pass

### Speed vs Quality

- **Slow + Low Power:** Detailed engraving, smooth finish
- **Fast + High Power:** Quick marking, may show lines
- **Medium + Medium:** Balanced approach, good for most uses

### File Preparation

1. **SVG files:** Clean up paths, remove duplicates
2. **PNG files:** Use high contrast, 300+ DPI
3. **Size correctly:** Match your intended output size
4. **Preview first:** Always check before sending

## Examples

### Example 1: Photo Engraving on Wood

```
File: photo.jpg (high contrast)
Power: 600
Speed: 1500 mm/min
Work Area: 300 x 200mm
Material: Light basswood
Focus: On surface
Result: Beautiful grayscale engraving
```

### Example 2: Logo Cutting on Acrylic

```
File: logo.svg (clean paths)
Power: 900
Speed: 500 mm/min
Work Area: 300 x 200mm
Material: 3mm clear acrylic
Focus: On surface
Passes: 2-3 (multiple passes for cutting)
Result: Clean cut logo
```

### Example 3: Text Engraving on Leather

```
File: text.svg (vector text)
Power: 400
Speed: 2000 mm/min
Work Area: 300 x 200mm
Material: Vegetable-tanned leather
Focus: On surface
Result: Crisp text, slight burning for contrast
```

## Support & Resources

### Getting Help

1. Check this guide first
2. Review error messages
3. Test with simple shapes
4. Consult your machine's manual
5. Join laser engraving communities

### Useful Resources

- **GRBL Documentation:** https://github.com/gnea/grbl/wiki
- **Marlin Firmware:** https://marlinfw.org/
- **Laser Safety:** OSHA guidelines
- **Material Testing:** Online laser engraving communities

## Future Enhancements

Coming soon:
- 🔄 Bluetooth device support
- 📡 WiFi/network machine control
- 📷 Camera preview integration
- 🎨 Live preview of toolpaths
- 📊 Job queue management
- 💾 G-code library/presets
- 🔧 Machine profiles saving

## License

This software is provided as-is for laser engraving purposes. Always follow safety guidelines and local regulations when operating laser equipment.

---

**Remember:** Safety first! Always monitor your machine during operation and keep emergency stop accessible.
