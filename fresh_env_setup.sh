#!/bin/bash

# Exit on any error
set -e

echo "Setting up Quote Optimisation application..."

# Create and activate virtual environment
if [ ! -d "fresh_venv" ]; then
    echo "Creating fresh virtual environment..."
    python3 -m venv fresh_venv
fi

# Activate virtual environment
source fresh_venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt
pip install flask flask-cors

# Create a startup script for the backend
cat > start_backend.sh << 'EOF'
#!/bin/bash
source fresh_venv/bin/activate
echo "Starting Flask backend on port 5001..."
python app.py
EOF
chmod +x start_backend.sh

# Create a startup script for the frontend
cat > start_frontend.sh << 'EOF'
#!/bin/bash
cd frontend
echo "Starting React frontend..."
npm start
EOF
chmod +x start_frontend.sh

echo "Setup complete!"
echo "To start the application:"
echo "1. Run ./start_backend.sh to start the Flask backend"
echo "2. Run ./start_frontend.sh to start the React frontend" 