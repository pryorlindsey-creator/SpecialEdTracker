#!/usr/bin/env python3
"""
Python launcher for Special Education Data Collection App
This script starts the Node.js application for easy Python-style execution.
"""

import subprocess
import sys
import os

def main():
    """Start the Special Education Data Collection App"""
    print("🎓 Starting Special Education Data Collection App...")
    print("=" * 50)
    
    try:
        # Check if Node.js is available
        subprocess.run(["node", "--version"], check=True, capture_output=True)
        print("✓ Node.js detected")
        
        # Check if npm is available  
        subprocess.run(["npm", "--version"], check=True, capture_output=True)
        print("✓ npm detected")
        
        # Install dependencies if node_modules doesn't exist
        if not os.path.exists("node_modules"):
            print("📦 Installing dependencies...")
            subprocess.run(["npm", "install"], check=True)
            print("✓ Dependencies installed")
        
        print("🚀 Starting application...")
        print("=" * 50)
        
        # Start the application using npm start for development
        result = subprocess.run(["npm", "run", "dev"], check=False)
        return result.returncode
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        print("Please ensure Node.js and npm are installed on your system.")
        return 1
    except KeyboardInterrupt:
        print("\n👋 Application stopped by user.")
        return 0
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())