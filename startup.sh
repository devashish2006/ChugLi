#!/bin/bash
echo "=== ChugLi Backend Startup Script ==="

# Navigate to app directory
cd /home/site/wwwroot

# Always ensure all dependencies are installed
echo "Checking and installing dependencies..."
npm install --omit=dev

echo "=== Verifying critical dependencies ==="
node -e "
const deps = ['@nestjs/common', '@nestjs/core', '@nestjs/schedule', '@nestjs/config', '@nestjs/platform-socket.io', 'socket.io'];
let missing = false;
deps.forEach(dep => {
  try {
    require(dep);
    console.log('✓', dep);
  } catch(e) {
    console.log('✗ MISSING:', dep);
    missing = true;
  }
});
if (missing) process.exit(1);
"

if [ $? -ne 0 ]; then
    echo "=== Critical dependencies missing! Retrying full install... ==="
    npm install
fi

echo "=== Starting application ==="
node dist/src/main.js
