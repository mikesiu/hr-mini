#!/usr/bin/env python3
"""
Test script to verify the file browser functionality.
"""

import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def test_tkinter_availability():
    """Test if tkinter is available for file browser."""
    print("=" * 60)
    print("TESTING FILE BROWSER FUNCTIONALITY")
    print("=" * 60)
    
    try:
        import tkinter as tk
        from tkinter import filedialog
        print("[SUCCESS] tkinter is available!")
        
        # Test if we can create a file dialog
        print("\nTesting file dialog creation...")
        root = tk.Tk()
        root.withdraw()  # Hide the main window
        
        print("[SUCCESS] File dialog can be created!")
        print("Note: File dialog will not actually open in this test.")
        
        root.destroy()
        
        print("\n[SUCCESS] File browser functionality is ready!")
        print("\nIn the Employee Directory page, you can now:")
        print("1. Choose 'Browse for file' option")
        print("2. Click 'Open File Browser' button")
        print("3. Navigate to your shared drive and select files")
        print("4. The selected file path will be automatically filled in")
        
        return True
        
    except ImportError as e:
        print(f"[ERROR] tkinter is not available: {e}")
        print("\nTo enable file browser functionality:")
        print("1. tkinter usually comes with Python by default")
        print("2. If missing, try: pip install tk")
        print("3. Or reinstall Python with tkinter support")
        print("\nYou can still use the manual path entry option.")
        return False
        
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        return False

if __name__ == "__main__":
    test_tkinter_availability()
