#!/usr/bin/env python3
"""
Build script for creating a standalone executable of the Laser Engraving File Converter.
This creates a .exe file that can be shared with friends without requiring Python installation.
"""

import os
import sys
import shutil
import subprocess

print("="*70)
print("Laser Engraving File Converter - Executable Builder")
print("="*70)
print("\nThis will create a standalone .exe file that includes:")
print("  ✓ Web interface")
print("  ✓ All conversion features")
print("  ✓ No Python installation required")
print("="*70)

# Check if PyInstaller is installed
try:
    import PyInstaller
    print("\n✓ PyInstaller is installed")
except ImportError:
    print("\n✗ PyInstaller not found. Installing...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    print("✓ PyInstaller installed")

# Create the spec file for PyInstaller
spec_content = """
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['web_app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('templates', 'templates'),
        ('static', 'static'),
        ('converter_core.py', '.'),
    ],
    hiddenimports=[
        'PIL._tkinter_finder',
        'cairosvg',
        'ezdxf',
        'svgwrite',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='LaserConverter',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
"""

print("\n📝 Creating PyInstaller spec file...")
with open('LaserConverter.spec', 'w') as f:
    f.write(spec_content)
print("✓ Spec file created")

print("\n🔨 Building executable...")
print("This may take a few minutes...")
print("-"*70)

try:
    subprocess.check_call(['pyinstaller', '--clean', 'LaserConverter.spec'])
    print("-"*70)
    print("\n✅ Build successful!")
    print("\n📁 Executable location: dist/LaserConverter.exe")
    print("\n📦 How to use:")
    print("  1. Copy 'dist/LaserConverter.exe' to your friend's computer")
    print("  2. Double-click LaserConverter.exe to start the server")
    print("  3. Open browser to http://localhost:5000")
    print("  4. Start converting files!")
    print("\n💡 Tip: You can also run it from command line with options")
    print("="*70)
    
except subprocess.CalledProcessError as e:
    print("\n✗ Build failed!")
    print(f"Error: {e}")
    sys.exit(1)

print("\n✨ Done! Your portable laser converter is ready to share!")
