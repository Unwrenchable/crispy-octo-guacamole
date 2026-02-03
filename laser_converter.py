#!/usr/bin/env python3
"""
Laser Engraving File Converter with Material Suggestions

This program converts various file formats to scalable high-definition files
suitable for laser engraving and provides material suggestions based on use cases.

Supported Input Formats:
- Vector: SVG, DXF, AI, EPS
- Raster: PNG, JPG, BMP, TIFF

Output Formats:
- SVG for precise, scalable lines/cuts/shapes
- High-resolution PNG (300+ DPI) for photo engraving and shading
"""

import argparse
import os
import sys
from PIL import Image


def detect_file_type(file_path):
    """
    Detect if input file is vector or raster based on extension.
    
    Args:
        file_path: Path to the input file
        
    Returns:
        'vector' or 'raster'
        
    Raises:
        ValueError: If file type is not supported
    """
    ext = os.path.splitext(file_path)[1].lower()
    vector_exts = ['.svg', '.dxf', '.ai', '.eps']
    raster_exts = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif']
    
    if ext in vector_exts:
        return 'vector'
    elif ext in raster_exts:
        return 'raster'
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def convert_to_svg(input_path):
    """
    Convert vector files to SVG format.
    
    Args:
        input_path: Path to input vector file
        
    Returns:
        Path to output SVG file
    """
    ext = os.path.splitext(input_path)[1].lower()
    output_svg = os.path.splitext(input_path)[0] + '_converted.svg'
    
    if ext == '.svg':
        # Already SVG, check if it's already a converted file to avoid redundant conversions
        basename = os.path.basename(input_path)
        if '_converted.svg' in basename:
            print(f"  Input is already a converted SVG, using as-is...")
            return input_path
        
        # Copy with optimization
        print(f"  Input is already SVG format, copying...")
        with open(input_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()
        with open(output_svg, 'w', encoding='utf-8') as f:
            f.write(svg_content)
            
    elif ext == '.dxf':
        # Convert DXF to SVG
        try:
            import ezdxf
            import svgwrite
            
            print(f"  Converting DXF to SVG...")
            doc = ezdxf.readfile(input_path)
            dwg = svgwrite.Drawing(output_svg, profile='tiny')
            
            # Iterate entities and add to SVG
            for entity in doc.modelspace():
                if entity.dxftype() == 'LINE':
                    start = entity.dxf.start[:2]
                    end = entity.dxf.end[:2]
                    dwg.add(dwg.line(start=start, end=end, stroke='black'))
                elif entity.dxftype() == 'CIRCLE':
                    center = entity.dxf.center[:2]
                    radius = entity.dxf.radius
                    dwg.add(dwg.circle(center=center, r=radius, stroke='black', fill='none'))
                elif entity.dxftype() == 'ARC':
                    # Basic arc handling - could be expanded
                    center = entity.dxf.center[:2]
                    radius = entity.dxf.radius
                    dwg.add(dwg.circle(center=center, r=radius, stroke='black', fill='none'))
            
            dwg.save()
            
        except ImportError:
            print("  WARNING: ezdxf or svgwrite not installed. Install with: pip install ezdxf svgwrite")
            raise
            
    elif ext in ['.ai', '.eps']:
        # Convert AI/EPS to SVG using Wand (requires ImageMagick)
        try:
            from wand.image import Image as WandImage
            
            print(f"  Converting {ext.upper()} to SVG using ImageMagick...")
            with WandImage(filename=input_path) as img:
                img.format = 'svg'
                img.save(filename=output_svg)
                
        except ImportError:
            print("  WARNING: Wand not installed. Install with: pip install wand")
            print("  NOTE: Wand requires ImageMagick to be installed on your system")
            raise
    
    return output_svg


def convert_to_high_res_png(input_path, dpi=300):
    """
    Convert raster files to high-resolution PNG (300+ DPI).
    
    Args:
        input_path: Path to input raster file
        dpi: Target DPI (default: 300)
        
    Returns:
        Path to output PNG file
    """
    output_png = os.path.splitext(input_path)[0] + '_hd.png'
    
    print(f"  Converting to high-resolution PNG ({dpi} DPI)...")
    img = Image.open(input_path)
    
    # Convert to RGB if necessary (some formats like CMYK need conversion)
    if img.mode not in ('RGB', 'RGBA', 'L'):
        img = img.convert('RGB')
    
    # Save with high DPI
    img.save(output_png, dpi=(dpi, dpi), format='PNG')
    print(f"  Output size: {img.size[0]}x{img.size[1]} pixels")
    
    return output_png


def raster_to_svg(input_path, threshold=128):
    """
    Simple vectorization of raster images to SVG.
    
    Note: This is a basic implementation. For production use, consider
    using Potrace or autotrace for better results.
    
    Args:
        input_path: Path to input raster file
        threshold: Grayscale threshold for black/white conversion
        
    Returns:
        Path to output SVG file
    """
    output_svg = os.path.splitext(input_path)[0] + '_traced.svg'
    
    try:
        import svgwrite
        
        print(f"  Tracing raster to SVG (threshold={threshold})...")
        print("  NOTE: Basic tracing - for better results, use Potrace externally")
        
        img = Image.open(input_path).convert('L')  # Convert to grayscale
        width, height = img.size
        
        # For large images, warn about file size
        if width * height > 1000000:
            print(f"  WARNING: Large image ({width}x{height}). Output SVG may be very large.")
            print(f"  Consider resizing or using proper vectorization tools.")
        
        dwg = svgwrite.Drawing(output_svg, size=(width, height), profile='tiny')
        pixels = img.load()
        
        # Simple pixel-to-rect conversion (creates large files)
        # Group consecutive black pixels for slightly better optimization
        for y in range(height):
            x = 0
            while x < width:
                if pixels[x, y] < threshold:
                    # Found black pixel, find run length
                    run_length = 1
                    while x + run_length < width and pixels[x + run_length, y] < threshold:
                        run_length += 1
                    
                    # Add rectangle for this run
                    dwg.add(dwg.rect(insert=(x, y), size=(run_length, 1), fill='black'))
                    x += run_length
                else:
                    x += 1
        
        dwg.save()
        
    except ImportError:
        print("  WARNING: svgwrite not installed. Install with: pip install svgwrite")
        raise
    
    return output_svg


def svg_to_png(input_path, dpi=300):
    """
    Convert SVG to high-resolution PNG.
    
    Args:
        input_path: Path to input SVG file
        dpi: Target DPI (default: 300)
        
    Returns:
        Path to output PNG file
    """
    output_png = os.path.splitext(input_path)[0] + '_hd.png'
    
    try:
        import cairosvg
        
        print(f"  Converting SVG to PNG ({dpi} DPI)...")
        
        # Calculate scale factor for DPI (96 is default SVG DPI)
        scale = dpi / 96.0
        
        cairosvg.svg2png(url=input_path, write_to=output_png, scale=scale)
        
    except ImportError:
        print("  WARNING: cairosvg not installed. Install with: pip install cairosvg")
        raise
    
    return output_png


# Material suggestions based on research
# Sources: xometry.com, heatsign.com, youtube.com (laser engraving tutorials)
MATERIAL_SUGGESTIONS = {
    'svg': {
        'signage': 'Acrylic or plywood (clear cuts, durable, weather-resistant)',
        'jewelry': 'Anodized aluminum or acrylic (precise details, lightweight)',
        'personalization': 'Leather or wood (scalable designs, natural look)',
        'photos': 'Not ideal for SVG; convert to raster for shading on wood or slate',
        'general': 'Basswood or birch plywood (versatile, affordable, good for testing)',
        'industrial': 'Stainless steel or anodized aluminum (durable, precise)',
        'arts': 'Acrylic or bamboo (aesthetic appeal, various colors)',
    },
    'png': {
        'signage': 'Wood or MDF (high-res for visibility, cost-effective)',
        'jewelry': 'Not recommended; use vector (SVG) for precision work',
        'personalization': 'Slate or leather (photo engraving, unique textures)',
        'photos': 'Wood, slate, or ceramic tile (300+ DPI for detail)',
        'general': 'Basswood (excellent for photo engraving, smooth surface)',
        'industrial': 'Anodized aluminum (for photo marking with proper laser settings)',
        'arts': 'Cork or leather (natural texture enhances engraving)',
    }
}


def suggest_material(output_path, use_case):
    """
    Suggest materials based on output file type and use case.
    
    Args:
        output_path: Path to output file
        use_case: Use case (e.g., 'signage', 'jewelry', 'personalization')
        
    Returns:
        Material suggestion string
    """
    ext = os.path.splitext(output_path)[1][1:].lower()  # Get extension without dot
    use_case_lower = use_case.lower()
    
    if ext in MATERIAL_SUGGESTIONS and use_case_lower in MATERIAL_SUGGESTIONS[ext]:
        return MATERIAL_SUGGESTIONS[ext][use_case_lower]
    
    # Default suggestion
    return "General suggestion: Basswood for versatility; always test on scrap material first"


def print_best_practices():
    """Print best practices for laser engraving."""
    print("\n" + "="*70)
    print("BEST PRACTICES FOR LASER ENGRAVING")
    print("="*70)
    print("1. Resolution: Use 300+ DPI for raster images (600 DPI for fine detail)")
    print("2. Scale: Work at 1:1 scale in your design")
    print("3. Vectors: Remove overlapping paths to prevent double-cutting")
    print("4. Testing: ALWAYS test on scrap material first")
    print("5. Safety: Never use PVC (releases toxic chlorine gas)")
    print("6. Materials: Start with basswood - forgiving and affordable")
    print("7. Software: Import results into LightBurn or similar for final setup")
    print("8. Settings: Adjust laser power/speed based on material and depth")
    print("="*70 + "\n")


def main():
    """Main program entry point."""
    parser = argparse.ArgumentParser(
        description="Laser Engraving File Converter with Material Suggestions",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s input.jpg --output-type svg --use-case photos
  %(prog)s design.dxf logo.png --output-type svg --use-case signage
  %(prog)s photo.jpg --output-type png --dpi 600 --use-case personalization
  
Use Cases:
  signage, jewelry, personalization, photos, general, industrial, arts
        """
    )
    
    parser.add_argument(
        'input_files',
        nargs='*',
        help="Input file path(s) - supports SVG, DXF, AI, EPS, PNG, JPG, BMP, TIFF"
    )
    
    parser.add_argument(
        '--output-type',
        choices=['svg', 'png'],
        default='svg',
        help="Output format: svg (vector) or png (raster) - default: svg"
    )
    
    parser.add_argument(
        '--use-case',
        default='general',
        help="Use case for material suggestions - default: general"
    )
    
    parser.add_argument(
        '--dpi',
        type=int,
        default=300,
        help="DPI for PNG output (minimum 300 recommended) - default: 300"
    )
    
    parser.add_argument(
        '--threshold',
        type=int,
        default=128,
        help="Threshold for raster-to-vector tracing (0-255) - default: 128"
    )
    
    parser.add_argument(
        '--best-practices',
        action='store_true',
        help="Show best practices for laser engraving"
    )
    
    args = parser.parse_args()
    
    # Show best practices if requested
    if args.best_practices:
        print_best_practices()
        if not args.input_files:
            return
    
    # Check if we have input files
    if not args.input_files:
        parser.error("input_files are required unless using --best-practices")
    
    # Validate DPI
    if args.dpi < 300:
        print(f"WARNING: DPI {args.dpi} is below recommended minimum of 300")
    
    print("\n" + "="*70)
    print("LASER ENGRAVING FILE CONVERTER")
    print("="*70)
    
    # Process each input file
    for input_file in args.input_files:
        print(f"\nProcessing: {input_file}")
        
        # Check if file exists
        if not os.path.exists(input_file):
            print(f"  ERROR: File not found: {input_file}")
            continue
        
        try:
            # Detect file type
            file_type = detect_file_type(input_file)
            print(f"  Detected: {file_type} file")
            
            # Convert based on desired output and input type
            if args.output_type == 'svg':
                if file_type == 'vector':
                    output = convert_to_svg(input_file)
                else:
                    # Raster to vector
                    output = raster_to_svg(input_file, threshold=args.threshold)
            else:  # png
                if file_type == 'raster':
                    output = convert_to_high_res_png(input_file, dpi=args.dpi)
                else:
                    # Vector to raster
                    output = svg_to_png(input_file, dpi=args.dpi)
            
            # Get material suggestion
            suggestion = suggest_material(output, args.use_case)
            
            # Print results
            print(f"  ✓ Converted to: {output}")
            print(f"  Material suggestion for '{args.use_case}':")
            print(f"    {suggestion}")
            
        except ValueError as e:
            print(f"  ERROR: {e}")
        except ImportError as e:
            print(f"  ERROR: Missing dependency - {e}")
            print(f"  Install all dependencies with: pip install -r requirements.txt")
        except Exception as e:
            print(f"  ERROR: Unexpected error - {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "="*70)
    print("Processing complete!")
    print("="*70)
    
    if not args.best_practices:
        print("\nTip: Run with --best-practices to see laser engraving guidelines")


if __name__ == "__main__":
    main()
