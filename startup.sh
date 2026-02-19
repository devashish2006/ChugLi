#!/bin/bash
echo "=== ChugLi Backend Startup Script ==="
echo "Current directory: $(pwd)"
echo "Contents:"
ls -la

# Navigate to app directory
cd /home/site/wwwroot

echo ""
echo "=== Installing dependencies ==="
npm install --omit=dev --loglevel=verbose

echo ""
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
if (missing) {
  console.log('');
  console.log('Some dependencies are missing! Checking node_modules...');
  process.exit(1);
}
console.log('');
console.log('✅ All critical dependencies verified');
"

if [ $? -ne 0 ]; then
    echo ""
    echo "=== Critical dependencies missing! Checking node_modules structure... ==="
    ls -la node_modules/@nestjs/ 2>/dev/null || echo "No @nestjs folder found"
    
    echo ""
    echo "=== Retrying with full npm install... ==="
    npm install --loglevel=verbose
    
    echo ""
    echo "=== Verifying again after full install... ==="
    node -e "try { require('@nestjs/schedule'); console.log('✅ @nestjs/schedule found'); } catch(e) { console.log('❌ Still missing:', e.message); process.exit(1); }"
fi

echo ""
echo "=== Starting application ==="
node dist/src/main.js
