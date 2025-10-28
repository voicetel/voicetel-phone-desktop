#!/bin/bash

# Comprehensive Docker build script for VoiceTel Phone
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 VoiceTel Phone Docker Build Script${NC}"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Function to build RPM
build_rpm() {
    echo -e "${YELLOW}📦 Building RPM package...${NC}"
    
    # Try Fedora first, fallback to Ubuntu+Alien
    echo "🔨 Building Docker image for RPM (trying Fedora first)..."
    if docker build -f Dockerfile.rpm -t voicetel-rpm-builder . 2>/dev/null; then
        echo -e "${GREEN}✅ Fedora-based build successful${NC}"
        DOCKERFILE="Dockerfile.rpm"
    else
        echo -e "${YELLOW}⚠️  Fedora build failed, trying Ubuntu+Alien approach...${NC}"
        docker build -f Dockerfile.rpm-ubuntu -t voicetel-rpm-builder .
        DOCKERFILE="Dockerfile.rpm-ubuntu"
    fi
    
    # Create output directory
    mkdir -p dist
    
    # Run the container and build RPM
    echo "🚀 Running RPM build in container..."
    docker run --rm \
        -v "$(pwd)/dist:/output" \
        -v "$(pwd):/source" \
        voicetel-rpm-builder sh -c "
            cd /source &&
            npm install &&
            npm run build:rpm &&
            cp /source/dist/*.rpm /output/ 2>/dev/null || echo 'No RPM files found'
        "
    
    # Check result
    if [ -f "dist/voicetel-phone-3.5.5.x86_64.rpm" ]; then
        echo -e "${GREEN}✅ RPM package built successfully!${NC}"
        echo -e "${BLUE}📁 Location: dist/voicetel-phone-3.5.5.x86_64.rpm${NC}"
        ls -lh dist/*.rpm
    else
        echo -e "${RED}❌ RPM package not found.${NC}"
        echo "Checking for any RPM files..."
        ls -la dist/*.rpm 2>/dev/null || echo "No RPM files found in dist/"
        return 1
    fi
}

# Function to build all packages
build_all() {
    echo -e "${YELLOW}📦 Building all packages (AppImage, DEB, RPM)...${NC}"
    
    # Build the Docker image
    echo "🔨 Building Docker image for all packages..."
    docker build -f Dockerfile.rpm -t voicetel-builder .
    
    # Create output directory
    mkdir -p dist
    
    # Run the container and build all packages
    echo "🚀 Running full build in container..."
    docker run --rm \
        -v "$(pwd)/dist:/output" \
        -v "$(pwd):/source" \
        voicetel-builder sh -c "
            cd /source &&
            npm install &&
            npm run build:linux &&
            cp /source/dist/* /output/ 2>/dev/null || echo 'No packages found'
        "
    
    # Check results
    echo -e "${GREEN}✅ Build completed!${NC}"
    echo -e "${BLUE}📁 Packages in dist/:${NC}"
    ls -lh dist/
}

# Function to clean up
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up Docker images...${NC}"
    docker rmi voicetel-rpm-builder voicetel-builder 2>/dev/null || true
    echo -e "${GREEN}✅ Cleanup completed!${NC}"
}

# Main script logic
case "${1:-rpm}" in
    "rpm")
        build_rpm
        ;;
    "all")
        build_all
        ;;
    "clean")
        cleanup
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [rpm|all|clean|help]"
        echo ""
        echo "Commands:"
        echo "  rpm   - Build only RPM package using Docker (default)"
        echo "  all   - Build all packages (AppImage, DEB, RPM) using Docker"
        echo "  clean - Clean up Docker images"
        echo "  help  - Show this help message"
        echo ""
        echo "Docker Approaches:"
        echo "  - Fedora-based: Uses native rpmbuild (Dockerfile.rpm)"
        echo "  - Ubuntu+Alien: Converts DEB to RPM (Dockerfile.rpm-ubuntu)"
        echo ""
        echo "NPM Scripts:"
        echo "  npm run build:rpm-docker  - Build RPM using Docker"
        echo "  npm run build:all-docker - Build all packages using Docker"
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
