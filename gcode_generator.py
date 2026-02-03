#!/usr/bin/env python3
"""
G-code Generator for Laser Engraving
Converts SVG and PNG files to G-code for laser engravers.
"""

import os
import math
from typing import List, Tuple, Optional
from PIL import Image
import xml.etree.ElementTree as ET


class GCodeGenerator:
    """Generate G-code for laser engraving from image files."""
    
    def __init__(self, work_area=(300, 200), units='mm'):
        """
        Initialize G-code generator.
        
        Args:
            work_area: (width, height) of machine work area
            units: 'mm' or 'inches'
        """
        self.work_area = work_area
        self.units = units
        self.feed_rate = 1000  # mm/min
        self.laser_power_max = 1000  # S parameter max value
    
    def generate_from_png(self, input_path: str, output_path: str, 
                          line_spacing: float = 0.1, 
                          power_min: int = 0,
                          power_max: int = 1000) -> str:
        """
        Generate G-code from PNG image for raster engraving.
        
        Args:
            input_path: Path to PNG file
            output_path: Path to save G-code file
            line_spacing: Spacing between raster lines in mm
            power_min: Minimum laser power (0-1000)
            power_max: Maximum laser power (0-1000)
            
        Returns:
            Path to generated G-code file
        """
        # Load and convert image to grayscale
        img = Image.open(input_path).convert('L')
        width, height = img.size
        pixels = img.load()
        
        # Calculate scaling to fit work area
        scale_x = self.work_area[0] / width
        scale_y = self.work_area[1] / height
        scale = min(scale_x, scale_y)
        
        # Generate G-code
        gcode_lines = []
        
        # Header
        gcode_lines.extend(self._generate_header())
        
        # Raster scan - line by line
        y_step = line_spacing
        num_lines = int(height * scale / y_step)
        
        for line_num in range(num_lines):
            y_pixel = int(line_num * y_step / scale)
            if y_pixel >= height:
                break
            
            y_pos = line_num * y_step
            
            # Scan left to right (or right to left alternating for efficiency)
            if line_num % 2 == 0:
                # Left to right
                x_range = range(width)
                reverse = False
            else:
                # Right to left
                x_range = range(width - 1, -1, -1)
                reverse = True
            
            for x_pixel in x_range:
                x_pos = x_pixel * scale
                
                # Get pixel brightness (0=black, 255=white)
                brightness = pixels[x_pixel, y_pixel]
                
                # Convert to laser power (inverted: darker = more power)
                power = int(power_max - (brightness / 255.0) * (power_max - power_min))
                
                # Move to position and set laser power
                if power > power_min:
                    gcode_lines.append(f"G1 X{x_pos:.3f} Y{y_pos:.3f} S{power} F{self.feed_rate}")
                else:
                    # Move with laser off
                    gcode_lines.append(f"G0 X{x_pos:.3f} Y{y_pos:.3f} S0")
        
        # Footer
        gcode_lines.extend(self._generate_footer())
        
        # Write to file
        with open(output_path, 'w') as f:
            f.write('\n'.join(gcode_lines))
        
        return output_path
    
    def generate_from_svg(self, input_path: str, output_path: str,
                          power: int = 800,
                          speed: int = 1000) -> str:
        """
        Generate G-code from SVG file for vector engraving.
        
        Args:
            input_path: Path to SVG file
            output_path: Path to save G-code file
            power: Laser power (0-1000)
            speed: Feed rate in mm/min
            
        Returns:
            Path to generated G-code file
        """
        self.feed_rate = speed
        
        # Parse SVG
        tree = ET.parse(input_path)
        root = tree.getroot()
        
        # Get SVG namespace
        ns = {'svg': 'http://www.w3.org/2000/svg'}
        
        gcode_lines = []
        
        # Header
        gcode_lines.extend(self._generate_header())
        
        # Set laser power for vector mode
        gcode_lines.append(f"S{power}  ; Set laser power")
        
        # Process paths and lines
        for elem in root.iter():
            if 'line' in elem.tag.lower():
                self._process_line(elem, gcode_lines, ns)
            elif 'rect' in elem.tag.lower():
                self._process_rect(elem, gcode_lines, ns)
            elif 'circle' in elem.tag.lower():
                self._process_circle(elem, gcode_lines, ns)
            elif 'path' in elem.tag.lower():
                self._process_path(elem, gcode_lines, ns)
        
        # Footer
        gcode_lines.extend(self._generate_footer())
        
        # Write to file
        with open(output_path, 'w') as f:
            f.write('\n'.join(gcode_lines))
        
        return output_path
    
    def _generate_header(self) -> List[str]:
        """Generate G-code header."""
        return [
            "; G-code generated by Laser Engraving File Converter",
            "; Units: mm",
            "G21  ; Set units to millimeters",
            "G90  ; Absolute positioning",
            "M3 S0  ; Laser on (PWM mode, power 0)",
            "G0 X0 Y0  ; Move to origin",
        ]
    
    def _generate_footer(self) -> List[str]:
        """Generate G-code footer."""
        return [
            "M5  ; Laser off",
            "G0 X0 Y0  ; Return to origin",
            "; End of program",
        ]
    
    def _process_line(self, elem, gcode_lines: List[str], ns):
        """Process SVG line element."""
        x1 = float(elem.get('x1', 0))
        y1 = float(elem.get('y1', 0))
        x2 = float(elem.get('x2', 0))
        y2 = float(elem.get('y2', 0))
        
        # Move to start with laser off
        gcode_lines.append(f"G0 X{x1:.3f} Y{y1:.3f} S0")
        # Cut line with laser on
        gcode_lines.append(f"G1 X{x2:.3f} Y{y2:.3f} F{self.feed_rate}")
    
    def _process_rect(self, elem, gcode_lines: List[str], ns):
        """Process SVG rectangle element."""
        x = float(elem.get('x', 0))
        y = float(elem.get('y', 0))
        width = float(elem.get('width', 0))
        height = float(elem.get('height', 0))
        
        # Move to start
        gcode_lines.append(f"G0 X{x:.3f} Y{y:.3f} S0")
        
        # Cut rectangle (clockwise)
        gcode_lines.append(f"G1 X{x + width:.3f} Y{y:.3f} F{self.feed_rate}")
        gcode_lines.append(f"G1 X{x + width:.3f} Y{y + height:.3f}")
        gcode_lines.append(f"G1 X{x:.3f} Y{y + height:.3f}")
        gcode_lines.append(f"G1 X{x:.3f} Y{y:.3f}")
    
    def _process_circle(self, elem, gcode_lines: List[str], ns):
        """Process SVG circle element."""
        cx = float(elem.get('cx', 0))
        cy = float(elem.get('cy', 0))
        r = float(elem.get('r', 0))
        
        # Move to start point (right side of circle)
        start_x = cx + r
        start_y = cy
        gcode_lines.append(f"G0 X{start_x:.3f} Y{start_y:.3f} S0")
        
        # Use arc command to draw circle (two 180° arcs)
        gcode_lines.append(f"G2 X{cx - r:.3f} Y{cy:.3f} I{-r:.3f} J0 F{self.feed_rate}")
        gcode_lines.append(f"G2 X{start_x:.3f} Y{start_y:.3f} I{r:.3f} J0")
    
    def _process_path(self, elem, gcode_lines: List[str], ns):
        """Process SVG path element (simplified - handles basic paths)."""
        d = elem.get('d', '')
        
        if not d:
            return
        
        # Very basic path parsing - only handles M (move) and L (line) commands
        # For production, use a proper SVG parser library
        commands = d.replace(',', ' ').split()
        
        current_x, current_y = 0, 0
        laser_on = False
        
        i = 0
        while i < len(commands):
            cmd = commands[i]
            
            if cmd == 'M' and i + 2 < len(commands):
                # Move to
                try:
                    x = float(commands[i + 1])
                    y = float(commands[i + 2])
                    gcode_lines.append(f"G0 X{x:.3f} Y{y:.3f} S0")
                    current_x, current_y = x, y
                    laser_on = False
                    i += 3
                except ValueError:
                    i += 1
            
            elif cmd == 'L' and i + 2 < len(commands):
                # Line to
                try:
                    x = float(commands[i + 1])
                    y = float(commands[i + 2])
                    if not laser_on:
                        gcode_lines.append(f"G1 X{x:.3f} Y{y:.3f} F{self.feed_rate}")
                        laser_on = True
                    else:
                        gcode_lines.append(f"G1 X{x:.3f} Y{y:.3f}")
                    current_x, current_y = x, y
                    i += 3
                except ValueError:
                    i += 1
            
            else:
                i += 1


def generate_gcode_from_file(input_path: str, output_path: str = None,
                             work_area: Tuple[float, float] = (300, 200),
                             **kwargs) -> str:
    """
    Convenience function to generate G-code from any supported file.
    
    Args:
        input_path: Path to input file (SVG or PNG)
        output_path: Path to output G-code file (optional)
        work_area: Machine work area (width, height) in mm
        **kwargs: Additional parameters passed to generator
        
    Returns:
        Path to generated G-code file
    """
    if output_path is None:
        output_path = os.path.splitext(input_path)[0] + '.gcode'
    
    generator = GCodeGenerator(work_area=work_area)
    
    ext = os.path.splitext(input_path)[1].lower()
    
    if ext == '.svg':
        return generator.generate_from_svg(input_path, output_path, **kwargs)
    elif ext in ['.png', '.jpg', '.jpeg']:
        return generator.generate_from_png(input_path, output_path, **kwargs)
    else:
        raise ValueError(f"Unsupported file type for G-code generation: {ext}")
