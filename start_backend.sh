#!/bin/bash
source fresh_venv/bin/activate
echo "Starting Flask backend on port 5001..."
FLASK_DEBUG=1 python app.py 