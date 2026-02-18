#!/bin/bash
echo "=== Post-deployment setup ==="

# Navigate to app directory
cd /home/site/wwwroot

# Check if @nestjs/schedule exists
if ! node -e "require('@nestjs/schedule')" 2>/dev/null; then
    echo "Missing dependencies detected. Installing..."
    npm install --production
    echo "Dependencies installed successfully"
else
    echo "All dependencies present"
fi

# Start the application
echo "Starting application..."
node dist/src/main.js
