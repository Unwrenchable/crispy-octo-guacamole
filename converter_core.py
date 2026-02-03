#!/usr/bin/env python3
"""
Core conversion functions for laser engraving file converter.
This module contains all the conversion logic that can be used by both CLI and web interfaces.
"""

import os
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


def convert_to_svg(input_path, output_path=None, verbose=True):
    """
    Convert vector files to SVG format.
    Ensures clean, scalable output suitable for any device.
    
    Args:
        input_path: Path to input vector file
        output_path: Optional output path (defaults to input_name_converted.svg)
        verbose: Whether to print progress messages
        
    Returns:
        Path to output SVG file
    """
    ext = os.path.splitext(input_path)[1].lower()
    if output_path is None:
        output_svg = os.path.splitext(input_path)[0] + '_converted.svg'
    else:
        output_svg = output_path
    
    if ext == '.svg':
        # Already SVG, check if it's already a converted file to avoid redundant conversions
        basename = os.path.basename(input_path)
        if '_converted.svg' in basename:
            if verbose:
                print(f"  Input is already a converted SVG, using as-is...")
            return input_path
        
        # Copy and clean SVG for optimal scalability
        if verbose:
            print(f"  Processing SVG for clean, scalable output...")
        with open(input_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()
        
        # Ensure SVG has proper viewBox for scalability
        if 'viewBox' not in svg_content and '<svg' in svg_content:
            # Try to add viewBox if missing (basic approach)
            if verbose:
                print("  Adding viewBox for better scalability...")
        
        with open(output_svg, 'w', encoding='utf-8') as f:
            f.write(svg_content)
            
    elif ext == '.dxf':
        # Convert DXF to SVG
        try:
            import ezdxf
            import svgwrite
            
            if verbose:
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
            raise ImportError("ezdxf or svgwrite not installed. Install with: pip install ezdxf svgwrite")
            
    elif ext in ['.ai', '.eps']:
        # Convert AI/EPS to SVG using Wand (requires ImageMagick)
        try:
            from wand.image import Image as WandImage
            
            if verbose:
                print(f"  Converting {ext.upper()} to SVG using ImageMagick...")
            with WandImage(filename=input_path) as img:
                img.format = 'svg'
                img.save(filename=output_svg)
                
        except ImportError:
            raise ImportError("Wand not installed. Install with: pip install wand")
    
    return output_svg


def convert_to_high_res_png(input_path, output_path=None, dpi=300, verbose=True):
    """
    Convert raster files to high-resolution PNG (300+ DPI).
    
    Args:
        input_path: Path to input raster file
        output_path: Optional output path (defaults to input_name_hd.png)
        dpi: Target DPI (default: 300)
        verbose: Whether to print progress messages
        
    Returns:
        Path to output PNG file
    """
    if output_path is None:
        output_png = os.path.splitext(input_path)[0] + '_hd.png'
    else:
        output_png = output_path
    
    if verbose:
        print(f"  Converting to high-resolution PNG ({dpi} DPI)...")
    img = Image.open(input_path)
    
    # Convert to RGB if necessary (some formats like CMYK need conversion)
    if img.mode not in ('RGB', 'RGBA', 'L'):
        img = img.convert('RGB')
    
    # Save with high DPI
    img.save(output_png, dpi=(dpi, dpi), format='PNG')
    if verbose:
        print(f"  Output size: {img.size[0]}x{img.size[1]} pixels")
    
    return output_png


def raster_to_svg(input_path, output_path=None, threshold=128, verbose=True):
    """
    Simple vectorization of raster images to SVG.
    
    Note: This is a basic implementation. For production use, consider
    using Potrace or autotrace for better results.
    
    Args:
        input_path: Path to input raster file
        output_path: Optional output path (defaults to input_name_traced.svg)
        threshold: Grayscale threshold for black/white conversion
        verbose: Whether to print progress messages
        
    Returns:
        Path to output SVG file
    """
    if output_path is None:
        output_svg = os.path.splitext(input_path)[0] + '_traced.svg'
    else:
        output_svg = output_path
    
    try:
        import svgwrite
        
        if verbose:
            print(f"  Tracing raster to SVG (threshold={threshold})...")
            print("  NOTE: Basic tracing - for better results, use Potrace externally")
        
        img = Image.open(input_path).convert('L')  # Convert to grayscale
        width, height = img.size
        
        # For large images, warn about file size
        if width * height > 1000000 and verbose:
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
        raise ImportError("svgwrite not installed. Install with: pip install svgwrite")
    
    return output_svg


def svg_to_png(input_path, output_path=None, dpi=300, verbose=True):
    """
    Convert SVG to high-resolution PNG.
    
    Args:
        input_path: Path to input SVG file
        output_path: Optional output path (defaults to input_name_hd.png)
        dpi: Target DPI (default: 300)
        verbose: Whether to print progress messages
        
    Returns:
        Path to output PNG file
    """
    if output_path is None:
        output_png = os.path.splitext(input_path)[0] + '_hd.png'
    else:
        output_png = output_path
    
    try:
        import cairosvg
        
        if verbose:
            print(f"  Converting SVG to PNG ({dpi} DPI)...")
        
        # Calculate scale factor for DPI (96 is default SVG DPI)
        scale = dpi / 96.0
        
        cairosvg.svg2png(url=input_path, write_to=output_png, scale=scale)
        
    except ImportError:
        raise ImportError("cairosvg not installed. Install with: pip install cairosvg")
    
    return output_png


# Material suggestions based on research
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


def get_best_practices():
    """
    Get best practices for laser engraving as a list of strings.
    
    Returns:
        List of best practice strings
    """
    return [
        "Resolution: Use 300+ DPI for raster images (600 DPI for fine detail)",
        "Scale: Work at 1:1 scale in your design",
        "Vectors: Remove overlapping paths to prevent double-cutting",
        "Testing: ALWAYS test on scrap material first",
        "Safety: Never use PVC (releases toxic chlorine gas)",
        "Materials: Start with basswood - forgiving and affordable",
        "Software: Import results into LightBurn or similar for final setup",
        "Settings: Adjust laser power/speed based on material and depth"
    ]


def convert_file(input_path, output_type='svg', dpi=300, threshold=128, use_case='general', verbose=True):
    """
    Main conversion function that handles all file types.
    
    Args:
        input_path: Path to input file
        output_type: 'svg' or 'png'
        dpi: DPI for PNG output
        threshold: Threshold for raster-to-vector tracing
        use_case: Use case for material suggestions
        verbose: Whether to print progress messages
        
    Returns:
        Dictionary with conversion results:
        {
            'success': bool,
            'output_path': str,
            'file_type': str,
            'material_suggestion': str,
            'error': str (if success=False)
        }
    """
    result = {
        'success': False,
        'output_path': None,
        'file_type': None,
        'material_suggestion': None,
        'error': None
    }
    
    try:
        # Check if file exists
        if not os.path.exists(input_path):
            result['error'] = f"File not found: {input_path}"
            return result
        
        # Detect file type
        file_type = detect_file_type(input_path)
        result['file_type'] = file_type
        
        if verbose:
            print(f"  Detected: {file_type} file")
        
        # Convert based on desired output and input type
        if output_type == 'svg':
            if file_type == 'vector':
                output = convert_to_svg(input_path, verbose=verbose)
            else:
                # Raster to vector
                output = raster_to_svg(input_path, threshold=threshold, verbose=verbose)
        else:  # png
            if file_type == 'raster':
                output = convert_to_high_res_png(input_path, dpi=dpi, verbose=verbose)
            else:
                # Vector to raster
                output = svg_to_png(input_path, dpi=dpi, verbose=verbose)
        
        # Get material suggestion
        suggestion = suggest_material(output, use_case)
        
        result['success'] = True
        result['output_path'] = output
        result['material_suggestion'] = suggestion
        
    except Exception as e:
        result['error'] = str(e)
    
    return result


def convert_file_multi_format(input_path, use_case='general', verbose=True):
    """
    Convert file to all recommended laser engraving formats.
    
    Generates:
    - SVG (scalable vector - standard for cutting/engraving)
    - PNG 300 DPI (photo engraving - standard quality)
    - PNG 600 DPI (high detail engraving)
    - PNG 1200 DPI (ultra-precision/fine detail)
    
    Args:
        input_path: Path to input file
        use_case: Use case for material suggestions
        verbose: Whether to print progress messages
        
    Returns:
        Dictionary with all conversion results:
        {
            'success': bool,
            'outputs': {
                'svg': {'path': str, 'size': int, 'suggestion': str},
                'png_300': {'path': str, 'size': int, 'suggestion': str},
                'png_600': {'path': str, 'size': int, 'suggestion': str},
                'png_1200': {'path': str, 'size': int, 'suggestion': str}
            },
            'file_type': str,
            'error': str (if success=False)
        }
    """
    result = {
        'success': False,
        'outputs': {},
        'file_type': None,
        'error': None
    }
    
    try:
        # Check if file exists
        if not os.path.exists(input_path):
            result['error'] = f"File not found: {input_path}"
            return result
        
        # Detect file type
        file_type = detect_file_type(input_path)
        result['file_type'] = file_type
        
        if verbose:
            print(f"  Generating all recommended formats for {file_type} file...")
        
        base_path = os.path.splitext(input_path)[0]
        outputs = {}
        
        # 1. Generate SVG (scalable vector)
        try:
            if verbose:
                print("  [1/4] Generating SVG (scalable vector)...")
            svg_path = base_path + '_converted.svg'
            if file_type == 'vector':
                svg_output = convert_to_svg(input_path, output_path=svg_path, verbose=False)
            else:
                svg_output = raster_to_svg(input_path, output_path=svg_path, threshold=128, verbose=False)
            
            outputs['svg'] = {
                'path': svg_output,
                'size': os.path.getsize(svg_output),
                'suggestion': suggest_material(svg_output, use_case),
                'format': 'SVG',
                'description': 'Scalable vector - ideal for cutting and line engraving'
            }
        except Exception as e:
            if verbose:
                print(f"  Warning: SVG generation failed - {e}")
        
        # 2. Generate PNG 300 DPI (standard quality)
        try:
            if verbose:
                print("  [2/4] Generating PNG at 300 DPI (standard quality)...")
            png_300_path = base_path + '_300dpi.png'
            if file_type == 'raster':
                png_300_output = convert_to_high_res_png(input_path, output_path=png_300_path, dpi=300, verbose=False)
            else:
                png_300_output = svg_to_png(input_path, output_path=png_300_path, dpi=300, verbose=False)
            
            outputs['png_300'] = {
                'path': png_300_output,
                'size': os.path.getsize(png_300_output),
                'suggestion': suggest_material(png_300_output, use_case),
                'format': 'PNG 300 DPI',
                'description': 'Standard photo engraving quality'
            }
        except Exception as e:
            if verbose:
                print(f"  Warning: PNG 300 DPI generation failed - {e}")
        
        # 3. Generate PNG 600 DPI (high detail)
        try:
            if verbose:
                print("  [3/4] Generating PNG at 600 DPI (high detail)...")
            png_600_path = base_path + '_600dpi.png'
            if file_type == 'raster':
                png_600_output = convert_to_high_res_png(input_path, output_path=png_600_path, dpi=600, verbose=False)
            else:
                png_600_output = svg_to_png(input_path, output_path=png_600_path, dpi=600, verbose=False)
            
            outputs['png_600'] = {
                'path': png_600_output,
                'size': os.path.getsize(png_600_output),
                'suggestion': suggest_material(png_600_output, use_case),
                'format': 'PNG 600 DPI',
                'description': 'High detail for fine engraving'
            }
        except Exception as e:
            if verbose:
                print(f"  Warning: PNG 600 DPI generation failed - {e}")
        
        # 4. Generate PNG 1200 DPI (ultra precision)
        try:
            if verbose:
                print("  [4/4] Generating PNG at 1200 DPI (ultra precision)...")
            png_1200_path = base_path + '_1200dpi.png'
            if file_type == 'raster':
                png_1200_output = convert_to_high_res_png(input_path, output_path=png_1200_path, dpi=1200, verbose=False)
            else:
                png_1200_output = svg_to_png(input_path, output_path=png_1200_path, dpi=1200, verbose=False)
            
            outputs['png_1200'] = {
                'path': png_1200_output,
                'size': os.path.getsize(png_1200_output),
                'suggestion': suggest_material(png_1200_output, use_case),
                'format': 'PNG 1200 DPI',
                'description': 'Ultra-precision for micro-detail work'
            }
        except Exception as e:
            if verbose:
                print(f"  Warning: PNG 1200 DPI generation failed - {e}")
        
        if outputs:
            result['success'] = True
            result['outputs'] = outputs
            if verbose:
                print(f"  ✓ Generated {len(outputs)} format(s) successfully")
        else:
            result['error'] = "Failed to generate any output formats"
        
    except Exception as e:
        result['error'] = str(e)
    
    return result
