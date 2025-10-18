"""
Test package initialization
File: backend/tests/__init__.py
"""

import os

# Set test environment
os.environ.setdefault("MOCK_MODE", "true")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

__all__ = ["conftest"]

