#!/bin/bash
# Example usage of the laser engraving file converter

echo "===================================================================="
echo "Laser Engraving File Converter - Example Usage"
echo "===================================================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    exit 1
fi

# Check if dependencies are installed
echo "Checking dependencies..."
python3 -c "import PIL, svgwrite, cairosvg, ezdxf" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

echo ""
echo "===================================================================="
echo "Example 1: Show best practices"
echo "===================================================================="
python3 laser_converter.py --best-practices

echo ""
echo "===================================================================="
echo "Example 2: Convert a raster image to SVG for engraving"
echo "===================================================================="
echo "Command: python3 laser_converter.py photo.jpg --output-type svg --use-case photos"
echo ""
echo "(Note: This example requires an actual image file)"

echo ""
echo "===================================================================="
echo "Example 3: Convert vector to high-res PNG"
echo "===================================================================="
echo "Command: python3 laser_converter.py design.svg --output-type png --dpi 600 --use-case signage"
echo ""
echo "(Note: This example requires an actual SVG file)"

echo ""
echo "===================================================================="
echo "Example 4: Batch process multiple files"
echo "===================================================================="
echo "Command: python3 laser_converter.py *.jpg *.png --output-type svg --use-case personalization"
echo ""

echo ""
echo "===================================================================="
echo "For more information, run:"
echo "  python3 laser_converter.py --help"
echo "===================================================================="
