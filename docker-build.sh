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
    
    # Run the container and copy RPM from pre-built image
    echo "🚀 Copying RPM from container..."
    docker run --rm \
        -v "$(pwd)/dist:/output" \
        voicetel-rpm-builder sh -c "
            # Copy from pre-built location in image
            if [ -d /app/dist ] && ls /app/dist/*.rpm 1> /dev/null 2>&1; then
                cp /app/dist/*.rpm /output/ && echo 'Copied RPM from /app/dist/'
            # Also try building fresh if not found
            elif [ -d /source ]; then
                cd /source &&
                npm install &&
                npm run build:rpm &&
                cp /source/dist/*.rpm /output/ 2>/dev/null && echo 'Built and copied RPM from /source/dist/'
            else
                echo 'No RPM files found'
                exit 1
            fi
        "
    
    # Check result - look for any .rpm file (actual filename is VoiceTel-3.5.5.rpm)
    if ls dist/*.rpm 1> /dev/null 2>&1; then
        RPM_FILE=$(ls dist/*.rpm | head -1)
        echo -e "${GREEN}✅ RPM package built successfully!${NC}"
        echo -e "${BLUE}📁 Location: ${RPM_FILE}${NC}"
        ls -lh dist/*.rpm
    else
        echo -e "${RED}❌ RPM package not found.${NC}"
        echo "Checking for any RPM files..."
        ls -la dist/*.rpm 2>/dev/null || echo "No RPM files found in dist/"
        return 1
    fi
}

# Function to build Windows packages
build_windows() {
    local BUILD_TYPE="${1:-all}"  # "all" or "portable"
    local BUILD_CMD="build:win"
    
    if [ "$BUILD_TYPE" = "portable" ]; then
        echo -e "${YELLOW}📦 Building Windows portable executable...${NC}"
        BUILD_CMD="build:win-portable"
    else
        echo -e "${YELLOW}📦 Building all Windows packages (NSIS, MSI, Portable, ZIP)...${NC}"
    fi
    
    # Try direct approach first (most reliable, no permission issues)
    echo "🔨 Building Docker image for Windows (direct approach)..."
    if docker build --build-arg BUILD_CMD="$BUILD_CMD" -f Dockerfile.windows-direct -t voicetel-windows-builder . 2>/dev/null; then
        echo -e "${GREEN}✅ Direct approach build successful${NC}"
        DOCKERFILE="Dockerfile.windows-direct"
    else
        echo -e "${YELLOW}⚠️  Direct approach failed, trying pre-built approach...${NC}"
        if docker build --build-arg BUILD_CMD="$BUILD_CMD" -f Dockerfile.windows-prebuilt -t voicetel-windows-builder . 2>/dev/null; then
            echo -e "${GREEN}✅ Pre-built approach build successful${NC}"
            DOCKERFILE="Dockerfile.windows-prebuilt"
        else
            echo -e "${RED}❌ All Windows build approaches failed!${NC}"
            return 1
        fi
    fi
    
    # Create output directory
    mkdir -p dist
    
    # Run the container and build Windows packages
    echo "🚀 Copying Windows packages from container..."
    if [ "$DOCKERFILE" = "Dockerfile.windows-direct" ] || [ "$DOCKERFILE" = "Dockerfile.windows-prebuilt" ]; then
        # Copy all Windows package types
        docker run --rm \
            -v "$(pwd)/dist:/output" \
            voicetel-windows-builder sh -c "
                # Copy all Windows package types
                (cp /app/dist/*.exe /output/ 2>/dev/null && echo 'Copied .exe files') || echo 'No .exe files found' &&
                (cp /app/dist/*.msi /output/ 2>/dev/null && echo 'Copied .msi files') || echo 'No .msi files found' &&
                (cp /app/dist/*.zip /output/ 2>/dev/null && echo 'Copied .zip files') || echo 'No .zip files found'
            "
    fi
    
    # Check results - look for any Windows package files
    if ls dist/*.exe dist/*.msi dist/*.zip 2>/dev/null | grep -q .; then
        echo -e "${GREEN}✅ Windows packages built successfully!${NC}"
        echo -e "${BLUE}📁 Windows packages in dist/:${NC}"
        ls -lh dist/*.exe dist/*.msi dist/*.zip 2>/dev/null | grep -E "\.(exe|msi|zip)$" || echo "No Windows packages found"
    else
        echo -e "${RED}❌ Windows packages not found.${NC}"
        echo "Checking for any Windows files..."
        ls -la dist/*.exe dist/*.msi dist/*.zip 2>/dev/null | grep -E "\.(exe|msi|zip)$" || echo "No Windows packages found in dist/"
        return 1
    fi
}

# Function to build all packages
build_all() {
    echo -e "${YELLOW}📦 Building all packages (AppImage, DEB, RPM, Windows)...${NC}"
    
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
    "windows")
        build_windows "all"
        ;;
    "windows-portable")
        build_windows "portable"
        ;;
    "all")
        build_all
        ;;
    "clean")
        cleanup
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [rpm|windows|windows-portable|all|clean|help]"
        echo ""
        echo "Commands:"
        echo "  rpm              - Build only RPM package using Docker (default)"
        echo "  windows          - Build all Windows packages (NSIS, MSI, Portable, ZIP) using Docker"
        echo "  windows-portable - Build only Windows portable executable using Docker"
        echo "  all              - Build all packages (AppImage, DEB, RPM) using Docker"
        echo "  clean            - Clean up Docker images"
        echo "  help             - Show this help message"
        echo ""
        echo "Docker Approaches:"
        echo "  - Fedora-based: Uses native rpmbuild (Dockerfile.rpm)"
        echo "  - Ubuntu+Alien: Converts DEB to RPM (Dockerfile.rpm-ubuntu)"
        echo "  - Direct: Windows builds with Wine (Dockerfile.windows-direct)"
        echo "  - Pre-built: Windows builds with better caching (Dockerfile.windows-prebuilt)"
        echo ""
        echo "NPM Scripts:"
        echo "  npm run build:rpm-docker              - Build RPM using Docker"
        echo "  npm run build:windows-docker         - Build all Windows packages using Docker"
        echo "  npm run build:windows-portable-docker - Build Windows portable only using Docker"
        echo "  npm run build:all-docker             - Build all packages using Docker"
        echo "  npm run build:win                    - Build all Windows packages (native, requires Wine on Linux)"
        echo "  npm run build:win-msi                - Build MSI installer only"
        echo "  npm run build:win-nsis               - Build NSIS installer only"
        echo "  npm run build:win-portable           - Build portable executable only"
        echo "  npm run build:win-zip                 - Build ZIP archive only"
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
