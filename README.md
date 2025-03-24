# Quote Optimisation Application

This application helps optimize insurance quotes with a Flask backend and React frontend.

## Setup Instructions

### Option 1: Using the setup script

1. Run the setup script to create a virtual environment and install dependencies:
   ```
   ./fresh_env_setup.sh
   ```

2. Start the backend:
   ```
   ./start_backend.sh
   ```

3. Start the frontend:
   ```
   ./start_frontend.sh
   ```

### Option 2: Manual setup

1. Create and activate a virtual environment:
   ```
   python3 -m venv fresh_venv
   source fresh_venv/bin/activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   pip install flask flask-cors
   ```

3. Start the Flask backend:
   ```
   python app.py
   ```

4. In a separate terminal, start the React frontend:
   ```
   cd frontend
   npm start
   ```

## Accessing the Application

- Backend API: http://localhost:5001/api
- Frontend: http://localhost:3000

## Troubleshooting

If you experience "API Connection Error":

1. Verify the backend is running:
   ```
   curl http://localhost:5001/api/healthcheck
   ```

2. Check for port conflicts:
   ```
   lsof -i :5001
   lsof -i :3000
   ```

3. If ports are in use, kill existing processes:
   ```
   kill -9 $(lsof -t -i:5001)
   kill -9 $(lsof -t -i:3000)
   ```

4. Clear browser cache or try incognito/private browsing mode

5. Restart both backend and frontend using the provided scripts