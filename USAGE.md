# Quick Start Guide - Laser Engraving File Converter

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Optional: Install ImageMagick for AI/EPS support
# Ubuntu/Debian: sudo apt-get install imagemagick
# macOS: brew install imagemagick
```

## Basic Usage

### Convert Image to SVG for Engraving
```bash
python laser_converter.py photo.jpg --output-type svg --use-case photos
```

### Convert Vector to High-Res PNG
```bash
python laser_converter.py design.svg --output-type png --dpi 600
```

### Batch Process Multiple Files
```bash
python laser_converter.py *.jpg *.png --output-type svg --use-case signage
```

## Use Cases

Choose a use case with `--use-case` for material recommendations:

- **signage** - Signs, displays, wayfinding
- **jewelry** - Earrings, pendants, accessories
- **personalization** - Custom gifts, names, dates
- **photos** - Photo engraving, portraits
- **general** - All-purpose engraving (default)
- **industrial** - Part marking, labels
- **arts** - Artistic projects, decorative items

## Examples

### Photo Engraving on Wood
```bash
# Convert photo to high-res PNG for raster engraving
python laser_converter.py family_photo.jpg --output-type png --dpi 600 --use-case photos
# Output: Suggests wood, slate, or ceramic tile
```

### Logo for Signage
```bash
# Convert logo to SVG for precise cutting
python laser_converter.py logo.png --output-type svg --use-case signage
# Output: Suggests acrylic or plywood
```

### Jewelry Design
```bash
# Process SVG design for jewelry
python laser_converter.py earring_design.svg --output-type svg --use-case jewelry
# Output: Suggests anodized aluminum or acrylic
```

### Custom Gift
```bash
# Convert design for personalized leather item
python laser_converter.py name_design.dxf --output-type svg --use-case personalization
# Output: Suggests leather or wood
```

## Options Reference

| Option | Default | Description |
|--------|---------|-------------|
| `--output-type` | svg | Output format: svg or png |
| `--use-case` | general | Use case for material suggestions |
| `--dpi` | 300 | DPI for PNG output (min 300) |
| `--threshold` | 128 | Threshold for raster tracing (0-255) |
| `--best-practices` | - | Show engraving guidelines |

## Tips

1. **Always start with high-quality source files**
   - Vectors: Use clean SVG files when possible
   - Rasters: 300 DPI minimum, 600 DPI for fine detail

2. **Test on scrap material first**
   - Every material behaves differently
   - Adjust laser settings accordingly

3. **Check your output files**
   - View converted files in your laser software
   - Verify dimensions and scale

4. **Use the right format**
   - SVG for cutting and line work
   - PNG for photo engraving and shading

5. **Material safety**
   - Never use PVC (toxic fumes)
   - Check material compatibility with your laser

## Common Workflows

### Workflow 1: Photo → Laser
```bash
1. python laser_converter.py photo.jpg --output-type png --dpi 600 --use-case photos
2. Import photo_hd.png into LightBurn
3. Test on scrap wood
4. Engrave final piece
```

### Workflow 2: Vector Design → Laser
```bash
1. python laser_converter.py design.svg --output-type svg --use-case signage
2. Import design_converted.svg into LightBurn
3. Check for overlapping paths
4. Test cut on scrap acrylic
5. Cut final piece
```

### Workflow 3: Mixed Media Project
```bash
1. python laser_converter.py *.png *.svg --output-type svg --use-case arts
2. Import all files into LightBurn
3. Arrange on workspace
4. Test on scrap material
5. Create final project
```

## Getting Help

```bash
# Show help message
python laser_converter.py --help

# Show best practices
python laser_converter.py --best-practices

# Run examples
bash examples.sh
```

## Troubleshooting

### "Module not found" errors
```bash
pip install -r requirements.txt
```

### AI/EPS conversion fails
```bash
# Install ImageMagick
# Ubuntu: sudo apt-get install imagemagick
# macOS: brew install imagemagick
```

### Output file too large
- For raster→SVG: Consider using dedicated tools like Potrace
- For high-res PNG: Reduce DPI if file size is an issue

### Poor tracing quality
- Adjust `--threshold` value (0-255)
- Use professional tools (Inkscape, Potrace) for better results
- Increase source image contrast before conversion

## Next Steps

1. Read the full README.md for detailed documentation
2. Test with your own files
3. Import results into your laser control software
4. Adjust laser settings for your specific material
5. Create amazing laser-engraved projects!
