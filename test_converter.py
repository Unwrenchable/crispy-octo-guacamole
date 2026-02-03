#!/usr/bin/env python3
"""
Simple validation test for laser_converter.py
Tests basic functionality without external dependencies
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_imports():
    """Test that all imports work"""
    print("Testing imports...", end=" ")
    try:
        import laser_converter
        print("✓")
        return True
    except ImportError as e:
        print(f"✗ Failed: {e}")
        return False

def test_detect_file_type():
    """Test file type detection"""
    print("Testing file type detection...", end=" ")
    try:
        from laser_converter import detect_file_type
        
        # Test vector files
        assert detect_file_type("test.svg") == "vector"
        assert detect_file_type("test.dxf") == "vector"
        assert detect_file_type("test.ai") == "vector"
        assert detect_file_type("test.eps") == "vector"
        
        # Test raster files
        assert detect_file_type("test.png") == "raster"
        assert detect_file_type("test.jpg") == "raster"
        assert detect_file_type("test.jpeg") == "raster"
        assert detect_file_type("test.bmp") == "raster"
        assert detect_file_type("test.tiff") == "raster"
        assert detect_file_type("test.tif") == "raster"
        
        # Test unsupported file
        try:
            detect_file_type("test.txt")
            print("✗ Should have raised ValueError")
            return False
        except ValueError:
            pass
        
        print("✓")
        return True
    except AssertionError as e:
        print(f"✗ Failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

def test_material_suggestions():
    """Test material suggestion system"""
    print("Testing material suggestions...", end=" ")
    try:
        from laser_converter import suggest_material, MATERIAL_SUGGESTIONS
        
        # Test known combinations
        result = suggest_material("output.svg", "signage")
        assert "Acrylic" in result or "plywood" in result
        
        result = suggest_material("output.png", "photos")
        assert "Wood" in result or "slate" in result or "ceramic" in result
        
        # Test default case
        result = suggest_material("output.xyz", "unknown")
        assert "General suggestion" in result
        
        # Verify all use cases exist and have meaningful content
        use_cases = ['signage', 'jewelry', 'personalization', 'photos', 'general', 'industrial', 'arts']
        for use_case in use_cases:
            assert use_case in MATERIAL_SUGGESTIONS['svg']
            assert use_case in MATERIAL_SUGGESTIONS['png']
            
            # Verify suggestions are non-empty and meaningful
            svg_suggestion = MATERIAL_SUGGESTIONS['svg'][use_case]
            png_suggestion = MATERIAL_SUGGESTIONS['png'][use_case]
            
            assert len(svg_suggestion) > 10, f"SVG suggestion for {use_case} too short"
            assert len(png_suggestion) > 10, f"PNG suggestion for {use_case} too short"
            
            # Check for relevant keywords (material names or "Not recommended" for inappropriate uses)
            if use_case != 'general':
                # Suggestions should mention materials OR indicate not recommended
                material_keywords = ['wood', 'acrylic', 'metal', 'leather', 'slate', 'aluminum', 
                                   'bamboo', 'ceramic', 'mdf', 'plywood', 'not recommended', 'not ideal']
                assert any(keyword in svg_suggestion.lower() for keyword in material_keywords), \
                    f"SVG suggestion for {use_case} missing material keywords: {svg_suggestion}"
                assert any(keyword in png_suggestion.lower() for keyword in material_keywords), \
                    f"PNG suggestion for {use_case} missing material keywords: {png_suggestion}"
        
        print("✓")
        return True
    except AssertionError as e:
        print(f"✗ Failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

def test_best_practices():
    """Test best practices display"""
    print("Testing best practices...", end=" ")
    try:
        from laser_converter import print_best_practices
        import io
        from contextlib import redirect_stdout
        
        # Capture output
        f = io.StringIO()
        with redirect_stdout(f):
            print_best_practices()
        
        output = f.getvalue()
        
        # Check for key phrases
        assert "BEST PRACTICES" in output
        assert "DPI" in output or "Resolution" in output
        assert "test" in output.lower()
        assert "material" in output.lower()
        
        print("✓")
        return True
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

def main():
    """Run all tests"""
    print("="*60)
    print("Laser Converter Validation Tests")
    print("="*60)
    
    tests = [
        test_imports,
        test_detect_file_type,
        test_material_suggestions,
        test_best_practices,
    ]
    
    results = []
    for test in tests:
        results.append(test())
    
    print("="*60)
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✓ All {total} tests passed!")
        print("="*60)
        return 0
    else:
        print(f"✗ {passed}/{total} tests passed")
        print("="*60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
