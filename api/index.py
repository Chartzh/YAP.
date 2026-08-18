import sys
import os

# Add project root to sys.path so app.py and its dependencies can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
