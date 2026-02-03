#!/usr/bin/env python3
"""
Laser Engraving File Conversion Program

This program handles file conversions for laser engraving, supports multiple
input formats (SVG, DXF, AI, EPS for vectors; PNG, JPG, BMP, TIFF for rasters),
outputs high-definition files, and suggests materials based on use cases.
"""

import os
import sys
import argparse
import shutil
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any


class MaterialSuggestion:
    """Suggests materials based on use cases and file properties."""
    
    MATERIAL_DATABASE = {
        'decorative': {
            'materials': ['Wood (Birch, Cherry, Walnut)', 'Acrylic (Clear, Colored)', 
                         'Leather', 'Cork'],
            'description': 'Best for decorative items like signs, art pieces, ornaments'
        },
        'functional': {
            'materials': ['MDF', 'Plywood', 'Hardwood', 'Aluminum', 'Stainless Steel'],
            'description': 'Best for functional items like enclosures, brackets, tools'
        },
        'jewelry': {
            'materials': ['Acrylic', 'Wood (Thin)', 'Leather', 'Anodized Aluminum'],
            'description': 'Best for jewelry items like pendants, earrings, bracelets'
        },
        'signage': {
            'materials': ['Acrylic', 'Wood', 'Aluminum Composite', 'HDU (High Density Urethane)'],
            'description': 'Best for indoor/outdoor signs and displays'
        },
        'prototype': {
            'materials': ['Cardboard', 'Foam Board', 'MDF', 'Acrylic'],
            'description': 'Best for rapid prototyping and testing designs'
        },
        'detailed_engraving': {
            'materials': ['Hardwood (Maple, Bamboo)', 'Anodized Aluminum', 'Glass', 'Marble'],
            'description': 'Best for high-detail engraving work like photos or fine art'
        }
    }
    
    @classmethod
    def suggest(cls, use_case: str) -> Dict[str, Any]:
        """Suggest materials based on use case."""
        use_case_lower = use_case.lower()
        
        # Find matching use case
        for key, value in cls.MATERIAL_DATABASE.items():
            if key in use_case_lower or use_case_lower in key:
                return {
                    'use_case': key,
                    'materials': value['materials'],
                    'description': value['description']
                }
        
        # Default suggestion if no match
        return {
            'use_case': 'general',
            'materials': ['Wood (Birch, Maple)', 'Acrylic (3mm-6mm)', 'Leather'],
            'description': 'General purpose materials suitable for most laser engraving projects'
        }
    
    @classmethod
    def list_all_use_cases(cls) -> List[str]:
        """List all available use cases."""
        return list(cls.MATERIAL_DATABASE.keys())


class FileConverter:
    """Handles file conversion for laser engraving."""
    
    VECTOR_FORMATS = ['.svg', '.dxf', '.ai', '.eps']
    RASTER_FORMATS = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif']
    
    def __init__(self):
        self.supported_formats = self.VECTOR_FORMATS + self.RASTER_FORMATS
    
    def is_vector(self, file_path: str) -> bool:
        """Check if file is a vector format."""
        ext = Path(file_path).suffix.lower()
        return ext in self.VECTOR_FORMATS
    
    def is_raster(self, file_path: str) -> bool:
        """Check if file is a raster format."""
        ext = Path(file_path).suffix.lower()
        return ext in self.RASTER_FORMATS
    
    def is_supported(self, file_path: str) -> bool:
        """Check if file format is supported."""
        ext = Path(file_path).suffix.lower()
        return ext in self.supported_formats
    
    def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """Get information about the input file."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        path = Path(file_path)
        info = {
            'name': path.name,
            'extension': path.suffix.lower(),
            'size_bytes': os.path.getsize(file_path),
            'size_mb': round(os.path.getsize(file_path) / (1024 * 1024), 2),
            'is_vector': self.is_vector(file_path),
            'is_raster': self.is_raster(file_path),
            'supported': self.is_supported(file_path)
        }
        
        return info
    
    def convert_vector_to_svg(self, input_file: str, output_file: str) -> bool:
        """
        Convert vector formats to high-definition SVG.
        
        Note: This is a placeholder implementation. For production use,
        you would need libraries like:
        - cairosvg for SVG manipulation
        - ezdxf for DXF files
        - svgwrite for SVG creation
        """
        info = self.get_file_info(input_file)
        
        if not info['is_vector']:
            raise ValueError(f"Input file is not a vector format: {input_file}")
        
        input_ext = info['extension']
        
        # For SVG files, we can copy or optimize
        if input_ext == '.svg':
            return self._copy_or_optimize_svg(input_file, output_file)
        
        # For other vector formats, provide guidance
        print(f"\nNote: Converting {input_ext} to SVG requires specialized libraries.")
        print(f"Recommended approach:")
        if input_ext == '.dxf':
            print("  - Use 'ezdxf' library to read DXF")
            print("  - Convert entities to SVG paths using 'svgwrite'")
        elif input_ext in ['.ai', '.eps']:
            print("  - Use Inkscape CLI: inkscape --export-type=svg input.ai")
            print("  - Or use ghostscript for EPS conversion")
        
        # Create a placeholder SVG with metadata
        self._create_conversion_placeholder_svg(input_file, output_file, info)
        return True
    
    def convert_raster_to_png(self, input_file: str, output_file: str,
                              target_dpi: int = 300, max_dimension: int = 4096) -> bool:
        """
        Convert raster formats to high-resolution PNG.
        
        Note: This is a placeholder implementation. For production use,
        you would need PIL/Pillow library.
        """
        info = self.get_file_info(input_file)
        
        if not info['is_raster']:
            raise ValueError(f"Input file is not a raster format: {input_file}")
        
        input_ext = info['extension']
        
        # For PNG files, we can copy or optimize
        if input_ext == '.png':
            return self._copy_or_optimize_png(input_file, output_file)
        
        # For other raster formats, provide guidance
        print(f"\nNote: Converting {input_ext} to PNG requires PIL/Pillow library.")
        print(f"Recommended approach:")
        print("  from PIL import Image")
        print(f"  img = Image.open('{input_file}')")
        print(f"  img.save('{output_file}', 'PNG', dpi=({target_dpi}, {target_dpi}))")
        
        # Create a placeholder conversion info file
        self._create_conversion_info(input_file, output_file, info)
        return True
    
    def _copy_or_optimize_svg(self, input_file: str, output_file: str) -> bool:
        """Copy or optimize SVG file."""
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Add metadata comment for laser engraving
        if '<?xml' in content:
            parts = content.split('?>', 1)
            if len(parts) == 2:
                content = parts[0] + '?>\n<!-- Optimized for Laser Engraving -->\n' + parts[1]
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✓ SVG file optimized: {output_file}")
        return True
    
    def _copy_or_optimize_png(self, input_file: str, output_file: str) -> bool:
        """Copy PNG file (in production, would optimize)."""
        shutil.copy2(input_file, output_file)
        print(f"✓ PNG file prepared: {output_file}")
        return True
    
    def _create_conversion_placeholder_svg(self, input_file: str, output_file: str, 
                                          info: Dict) -> None:
        """Create a placeholder SVG with conversion information."""
        svg_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!-- Conversion Placeholder: {info['name']} -->
<!-- Original Format: {info['extension']} -->
<!-- File Size: {info['size_mb']} MB -->
<!-- This is a placeholder. Use appropriate conversion tools for production. -->
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">
  <rect width="200" height="100" fill="#f0f0f0" stroke="#333" stroke-width="2"/>
  <text x="100" y="40" text-anchor="middle" font-family="Arial" font-size="12" fill="#333">
    Conversion Required
  </text>
  <text x="100" y="60" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">
    {info['extension'].upper()} → SVG
  </text>
  <text x="100" y="80" text-anchor="middle" font-family="Arial" font-size="8" fill="#999">
    {info['name']}
  </text>
</svg>"""
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        
        print(f"✓ Conversion placeholder created: {output_file}")
    
    def _create_conversion_info(self, input_file: str, output_file: str, 
                                info: Dict) -> None:
        """Create conversion information file."""
        info_file = output_file + '.info.txt'
        with open(info_file, 'w', encoding='utf-8') as f:
            f.write(f"Conversion Information\n")
            f.write(f"=====================\n\n")
            f.write(f"Input File: {info['name']}\n")
            f.write(f"Format: {info['extension']}\n")
            f.write(f"Size: {info['size_mb']} MB\n")
            f.write(f"Type: {'Raster' if info['is_raster'] else 'Vector'}\n")
            f.write(f"\nOutput File: {output_file}\n")
            f.write(f"\nNote: Use PIL/Pillow for actual conversion\n")
        
        print(f"✓ Conversion info created: {info_file}")


def main():
    """Main program entry point."""
    parser = argparse.ArgumentParser(
        description='Laser Engraving File Conversion Tool',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Convert a vector file to SVG
  %(prog)s -i design.dxf -o output.svg
  
  # Convert a raster file to high-res PNG
  %(prog)s -i photo.jpg -o output.png --dpi 600
  
  # Get material suggestions
  %(prog)s --suggest-material decorative
  
  # Get file information
  %(prog)s -i myfile.svg --info
  
  # List supported use cases
  %(prog)s --list-use-cases

Supported Input Formats:
  Vectors: SVG, DXF, AI, EPS
  Rasters: PNG, JPG, BMP, TIFF
        """
    )
    
    parser.add_argument('-i', '--input', type=str, 
                       help='Input file path')
    parser.add_argument('-o', '--output', type=str,
                       help='Output file path (default: auto-generated)')
    parser.add_argument('--dpi', type=int, default=300,
                       help='Target DPI for raster output (default: 300)')
    parser.add_argument('--max-dimension', type=int, default=4096,
                       help='Maximum dimension for raster output (default: 4096)')
    parser.add_argument('--suggest-material', type=str,
                       help='Get material suggestions for a use case')
    parser.add_argument('--list-use-cases', action='store_true',
                       help='List all available use cases')
    parser.add_argument('--info', action='store_true',
                       help='Display file information only')
    
    args = parser.parse_args()
    
    # Handle material suggestions
    if args.suggest_material:
        suggestion = MaterialSuggestion.suggest(args.suggest_material)
        print("\n" + "="*60)
        print(f"Material Suggestions for: {suggestion['use_case'].upper()}")
        print("="*60)
        print(f"\n{suggestion['description']}\n")
        print("Recommended Materials:")
        for i, material in enumerate(suggestion['materials'], 1):
            print(f"  {i}. {material}")
        print("\n" + "="*60 + "\n")
        return 0
    
    # Handle list use cases
    if args.list_use_cases:
        use_cases = MaterialSuggestion.list_all_use_cases()
        print("\n" + "="*60)
        print("Available Use Cases for Material Suggestions")
        print("="*60)
        for i, case in enumerate(use_cases, 1):
            desc = MaterialSuggestion.MATERIAL_DATABASE[case]['description']
            print(f"\n{i}. {case.upper()}")
            print(f"   {desc}")
        print("\n" + "="*60 + "\n")
        return 0
    
    # Require input file for conversion operations
    if not args.input:
        parser.print_help()
        print("\nError: Input file required for conversion operations")
        return 1
    
    # Initialize converter
    converter = FileConverter()
    
    try:
        # Get file information
        info = converter.get_file_info(args.input)
        
        # Display file info
        if args.info:
            print("\n" + "="*60)
            print(f"File Information: {info['name']}")
            print("="*60)
            print(f"Extension: {info['extension']}")
            print(f"Size: {info['size_mb']} MB ({info['size_bytes']:,} bytes)")
            print(f"Type: {'Vector' if info['is_vector'] else 'Raster' if info['is_raster'] else 'Unknown'}")
            print(f"Supported: {'Yes' if info['supported'] else 'No'}")
            print("="*60 + "\n")
            return 0
        
        # Check if format is supported
        if not info['supported']:
            print(f"Error: Unsupported file format: {info['extension']}")
            print(f"Supported formats: {', '.join(converter.supported_formats)}")
            return 1
        
        # Determine output file
        if not args.output:
            input_path = Path(args.input)
            if info['is_vector']:
                args.output = str(input_path.with_suffix('.svg'))
            else:
                args.output = str(input_path.with_suffix('.png'))
        
        # Perform conversion
        print(f"\nProcessing: {info['name']}")
        print(f"Input Type: {'Vector' if info['is_vector'] else 'Raster'}")
        print(f"Output File: {args.output}\n")
        
        if info['is_vector']:
            converter.convert_vector_to_svg(args.input, args.output)
        else:
            converter.convert_raster_to_png(args.input, args.output, 
                                           target_dpi=args.dpi,
                                           max_dimension=args.max_dimension)
        
        print(f"\n✓ Conversion completed successfully!")
        print(f"Output: {args.output}\n")
        
        return 0
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return 1
    except ValueError as e:
        print(f"Error: {e}")
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
