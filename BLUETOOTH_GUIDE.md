# Bluetooth Laser Engraver Support Guide

## Overview

**YES! Bluetooth laser engravers ARE a real thing!** This application supports connecting to laser engraving machines via Bluetooth, in addition to traditional USB/Serial connections.

## What Are Bluetooth Laser Engravers?

Bluetooth laser engravers are desktop/portable laser engraving machines equipped with built-in Bluetooth modules that allow wireless control from computers, smartphones, and tablets. They're especially popular in the hobbyist and small business segments.

### How Bluetooth Laser Engravers Work

1. **Built-in Bluetooth Module**: The engraver has a Bluetooth radio (usually Bluetooth 4.0 or 5.0)
2. **Pairing**: Device pairs with your computer like any Bluetooth device
3. **Serial Port Profile (SPP)**: Uses Bluetooth's SPP to create a virtual serial connection
4. **G-code Transmission**: Your computer sends G-code commands wirelessly
5. **Real-time Control**: Monitor status and control engraving remotely

### Popular Bluetooth-Enabled Models

**Desktop/Portable Engravers:**
- **xTool M1** - Bluetooth + USB + WiFi
- **LaserPecker series** (L1, L2, LP3, LP4) - Primary Bluetooth control
- **NEJE Master 2S Plus** - Bluetooth capable
- **AtomStack series** (some models) - Bluetooth option
- **Ortur Laser Master 3** - Bluetooth enabled
- **Mini portable engravers** - Many support Bluetooth

**Note**: Check your specific model's specifications to confirm Bluetooth capability.

## Advantages of Bluetooth

✅ **No Cables Required** - Clean, wireless setup
✅ **Mobile Control** - Control from phone/tablet (with app)
✅ **Flexibility** - Place engraver anywhere within range
✅ **Portability** - Great for craft shows, mobile workshops
✅ **Easy Setup** - Just pair and connect
✅ **Works with this App** - Convert files and send wirelessly!

## Limitations to Know

⚠️ **Range**: 10-30 feet (3-10 meters) typical
⚠️ **Speed**: Slower data transfer than USB (usually fine for small jobs)
⚠️ **Latency**: May have slight delay compared to wired
⚠️ **Interference**: Other Bluetooth devices can cause issues
⚠️ **Power**: Machine still needs wall power (only control is wireless)
⚠️ **Large Files**: USB recommended for complex/large engravings

## Installation

### Step 1: Install Bluetooth Support (Optional)

Bluetooth support requires the `pybluez` library. This is **optional** - the app works fine without it if you only have USB engravers.

#### Windows:
```bash
# Requires Microsoft Visual C++ 14.0 or greater
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
pip install pybluez
```

#### Linux:
```bash
# Install Bluetooth development files
sudo apt-get install libbluetooth-dev python3-dev

# Install pybluez
pip install pybluez
```

#### macOS:
```bash
# Should work out of the box on most macOS versions
pip install pybluez
```

**Note**: If installation fails, the app will still work with USB/Serial connections.

### Step 2: Enable Bluetooth (if disabled)

If Bluetooth scanning doesn't work, uncomment the line in `requirements.txt`:
```txt
# Change this:
# pybluez>=0.23

# To this:
pybluez>=0.23
```

Then run: `pip install -r requirements.txt`

## Usage

### Step 1: Pair Your Engraver

**First time only - pair via your operating system:**

#### Windows:
1. Go to **Settings** → **Devices** → **Bluetooth & other devices**
2. Click **"Add Bluetooth or other device"**
3. Turn on your laser engraver's Bluetooth
4. Select your engraver from the list
5. Complete pairing (may require PIN, often "0000" or "1234")

#### Linux:
```bash
bluetoothctl
power on
scan on
# Wait for your device to appear
pair XX:XX:XX:XX:XX:XX
trust XX:XX:XX:XX:XX:XX
connect XX:XX:XX:XX:XX:XX
```

#### macOS:
1. Go to **System Preferences** → **Bluetooth**
2. Turn on your laser engraver's Bluetooth
3. Click **"Connect"** next to your engraver

### Step 2: Scan for Devices

In the web interface:
1. Click **"🔍 SCAN FOR MACHINES"**
2. Wait 10-15 seconds (Bluetooth scan takes time)
3. Your Bluetooth engraver will appear with a **"🔵 Bluetooth"** indicator
4. USB devices will show **"🔌 USB/Serial"**

### Step 3: Connect

1. Click **"🔌 CONNECT"** on your Bluetooth device
2. Wait for connection to establish (may take 5-10 seconds)
3. Status will change to **"🟢 CONNECTED"**

### Step 4: Engrave!

Now use it exactly like a USB engraver:
1. Upload and convert your file
2. Adjust power/speed settings
3. Click **"⚡ ENGRAVE NOW"**
4. Monitor progress wirelessly

## Troubleshooting

### "pybluez not installed" Message

**Solution**: Bluetooth scanning is disabled because pybluez isn't installed. You have two options:
1. **Install pybluez** (see Installation section above)
2. **Use USB** instead - the app works great with USB connections

### Bluetooth Scan Finds No Devices

**Possible causes**:
1. **Engraver not in pairing mode**: Turn on Bluetooth on your engraver
2. **Not paired yet**: Pair via OS settings first (see Step 1 above)
3. **Out of range**: Move engraver closer (within 10 feet)
4. **Bluetooth off**: Ensure computer's Bluetooth is enabled
5. **Need permissions**: On Linux, may need to run with `sudo`

### "Permission denied" or "Bluetooth error"

**On Linux**: Bluetooth scanning requires elevated permissions
```bash
# Option 1: Run with sudo (not recommended for production)
sudo python web_app.py

# Option 2: Add user to bluetooth group
sudo usermod -a -G bluetooth $USER
# Then log out and back in
```

### Connection Drops or Timeouts

**Solutions**:
1. **Move closer**: Reduce distance to engraver
2. **Remove interference**: Turn off other Bluetooth devices
3. **Check battery**: If portable, ensure fully charged
4. **Try USB**: For complex jobs, USB is more reliable
5. **Restart both**: Restart computer and engraver

### Slow G-code Transfer

**Expected behavior**: Bluetooth is slower than USB, especially for large files.

**Solutions**:
- **Reduce resolution**: Use lower DPI for raster engravings
- **Simplify vectors**: Reduce number of paths in SVG
- **Use USB for large jobs**: Switch to USB for complex projects
- **Be patient**: Small jobs work fine over Bluetooth

### Device Found But Won't Connect

**Check**:
1. **Already connected elsewhere**: Disconnect from phone/other device
2. **Wrong channel**: The app auto-detects, but some devices are tricky
3. **Need re-pairing**: Unpair and re-pair via OS settings
4. **Try USB mode**: Your engraver may support both

## Best Practices

### ✅ DO

- ✅ **Pair first** through OS settings before using app
- ✅ **Stay within range** (under 10 feet is safest)
- ✅ **Use for small jobs** (simple vectors, small rasters)
- ✅ **Keep machine powered** (wall power required)
- ✅ **Test with USB first** to confirm G-code works
- ✅ **Have good WiFi** for web interface while using Bluetooth to machine

### ❌ DON'T

- ❌ **Don't expect USB speed** - Bluetooth is slower
- ❌ **Don't use for huge files** - Switch to USB
- ❌ **Don't leave mid-job** - Stay in range during engraving
- ❌ **Don't use with interference** - Keep away from microwaves, WiFi routers
- ❌ **Don't rely on battery** - Use wall power for safety

## Comparison: Bluetooth vs USB

| Feature | Bluetooth | USB/Serial |
|---------|-----------|------------|
| **Setup** | Wireless, flexible | Cable required |
| **Speed** | Slower (1-3 Mbps) | Fast (12+ Mbps) |
| **Range** | 10-30 feet | Cable length |
| **Reliability** | Can drop | Very stable |
| **Best For** | Small jobs, mobile | Large jobs, production |
| **Latency** | ~100ms | ~1ms |
| **Interference** | Possible | No interference |
| **Cost** | Often higher | Standard option |

## Connection Type Indicators

In the web interface, you'll see different indicators:

- **🔌 USB/Serial** - Wired USB or serial connection
- **🔵 Bluetooth** - Wireless Bluetooth connection
- **🟢 Connected** - Active connection established
- **🟠 Connecting** - Connection in progress
- **🔴 Disconnected** - No connection

## Technical Details

### Bluetooth Protocol

- **Profile**: SPP (Serial Port Profile)
- **Channel**: Usually 1 (auto-detected)
- **Baud Rate**: Simulated (Bluetooth handles actual transmission)
- **Range**: Class 2 Bluetooth (10 meters typical)
- **Frequency**: 2.4 GHz ISM band

### What Happens During Connection

1. App scans for Bluetooth devices
2. Filters for laser engraver keywords
3. Creates RFCOMM socket
4. Discovers SPP service
5. Connects to appropriate channel
6. Establishes bidirectional communication
7. Sends G-code commands as with serial

### Command Protocol

Same G-code commands work over Bluetooth as USB:
- `G0/G1` - Move commands
- `M3/M5` - Laser on/off
- `$H` - Home
- `?` - Status query
- `!` - Feed hold (pause)
- `~` - Resume

## Examples

### Example 1: Engraving a Logo (Bluetooth)

```
1. Turn on engraver's Bluetooth
2. Pair via Windows Settings
3. Open web interface
4. Scan for machines → See "LaserPecker L2"
5. Click Connect → Wait 5 seconds
6. Upload logo.svg
7. Convert to all formats
8. Adjust: Power=600, Speed=1000
9. Click "Engrave Now"
10. Watch progress wirelessly!
```

### Example 2: Photo Engraving (Switch to USB)

```
1. Have high-res photo (photo.jpg)
2. Convert to 600 DPI PNG
3. Connect via USB (more reliable for large files)
4. Generate G-code from PNG
5. Send to machine
6. Better results with wired connection
```

## Supported Engravers

### ✅ Known Working (Bluetooth)

- LaserPecker L1, L2, LP3, LP4
- xTool M1 (Bluetooth mode)
- NEJE Master 2S Plus
- Some AtomStack models
- Various mini portable engravers

### ⚠️ May Work (Check Specs)

- Ortur Laser Master series (model dependent)
- Sculpfun series (some models)
- Generic Bluetooth GRBL controllers

### ❌ Won't Work (No Bluetooth)

- K40 laser engravers (USB only)
- Most industrial CO2 lasers
- Older CNC/laser combos
- Basic DIY GRBL boards (unless Bluetooth added)

## Getting Help

If you're unsure whether your engraver supports Bluetooth:

1. **Check manual**: Look for "Bluetooth" in specifications
2. **Look for indicator**: Blue LED or Bluetooth logo on device
3. **Try pairing**: See if it appears in OS Bluetooth settings
4. **Contact manufacturer**: Ask about Bluetooth capability
5. **Try USB**: All engravers have USB/serial as fallback

## Future Enhancements

Planned improvements for Bluetooth support:

- 🔄 Auto-reconnect on connection loss
- 📊 Signal strength indicator
- 🔋 Battery level monitoring (if supported)
- 📱 Mobile app (iOS/Android)
- 🌐 WiFi support (for WiFi-enabled engravers)

## Summary

**Bluetooth laser engravers are real and this app supports them!**

- ✅ Wireless freedom
- ✅ Mobile device control
- ✅ Easy setup
- ✅ Works with popular brands
- ✅ Same features as USB
- ⚠️ Slower than USB
- ⚠️ Limited range
- 💡 Best for small jobs

**For production work, USB is still recommended. For convenience and flexibility, Bluetooth is awesome!**

## Questions?

**Q: Do I need Bluetooth support if I only have USB engravers?**
A: No! The app works perfectly with just USB. Bluetooth support is optional.

**Q: Can I use my phone to control the engraver?**
A: The web interface works on phones, but Bluetooth connection currently requires desktop (future feature).

**Q: My engraver has Bluetooth but won't connect?**
A: Try USB first to ensure G-code compatibility, then troubleshoot Bluetooth separately.

**Q: Is Bluetooth secure?**
A: Bluetooth SPP connections are reasonably secure (same as any Bluetooth device). For added security, keep engraver out of public Bluetooth range.

**Q: Can I use Bluetooth and USB at the same time?**
A: No, connect via one method at a time.

---

**Happy wireless engraving!** 🔵⚡✨
