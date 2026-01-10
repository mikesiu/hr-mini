#!/usr/bin/env python3
"""
Migration script to add termination table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.base import Base, engine
from app.models.termination import Termination

def migrate():
    """Create the termination table"""
    print("Creating termination table...")
    
    # Create the table
    Termination.__table__.create(engine, checkfirst=True)
    
    print("✅ Termination table created successfully!")

if __name__ == "__main__":
    migrate()
