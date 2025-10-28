#!/bin/bash

# Script to build RPM package using Docker
set -e

echo "🐳 Building RPM package using Docker..."

# Build the Docker image
echo "📦 Building Docker image..."
docker build -f Dockerfile.rpm -t voicetel-rpm-builder .

# Run the container and copy the RPM file
echo "🔨 Building RPM package..."
docker run --rm -v "$(pwd)/dist:/output" voicetel-rpm-builder sh -c "
    npm run build:rpm && 
    cp /app/dist/*.rpm /output/ 2>/dev/null || echo 'No RPM files found'
"

# Check if RPM was created
if [ -f "dist/voicetel-phone-3.5.5.x86_64.rpm" ]; then
    echo "✅ RPM package built successfully!"
    echo "📁 Location: dist/voicetel-phone-3.5.5.x86_64.rpm"
    ls -lh dist/*.rpm
else
    echo "❌ RPM package not found. Checking for any RPM files..."
    ls -la dist/*.rpm 2>/dev/null || echo "No RPM files found in dist/"
fi
