#!/bin/bash

# Cross-architecture Docker build test script
# This script tests if your Docker images will build correctly on different architecture systems
# It is particularly useful for testing ARM64 to AMD64 compatibility and vice versa

# Colors for pretty output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Docker Cross-Architecture Build Test Tool ${NC}"
echo -e "${BLUE}============================================${NC}"

# Function to display info
info() {
    echo -e "${BLUE}[Info]${NC} $1"
}

# Function to display success
success() {
    echo -e "${GREEN}[Success]${NC} $1"
}

# Function to display warning
warning() {
    echo -e "${YELLOW}[Warning]${NC} $1"
}

# Function to display error and exit
error() {
    echo -e "${RED}[Error]${NC} $1"
    exit 1
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
fi

# Display current architecture
CURRENT_ARCH=$(uname -m)
info "Your current architecture is: ${YELLOW}$CURRENT_ARCH${NC}"

# Check if Docker buildx is available
if ! docker buildx version &> /dev/null; then
    warning "Docker buildx not available or not installed."
    info "Checking if QEMU emulation is possible..."
    
    # Try to install QEMU and Docker buildx
    info "Setting up QEMU emulation for multi-architecture builds..."
    if ! docker run --privileged --rm tonistiigi/binfmt --install all; then
        error "Failed to set up QEMU emulation."
    fi
    
    info "Creating a new builder instance with multi-architecture support..."
    docker buildx create --name multiarch-builder --driver docker-container --use || error "Failed to create buildx builder"
    docker buildx inspect --bootstrap || error "Failed to bootstrap buildx builder"
else
    info "Docker buildx is available."
    
    # Make sure we have a proper builder
    if ! docker buildx ls | grep -q "multiarch-builder"; then
        info "Creating a new builder instance with multi-architecture support..."
        docker buildx create --name multiarch-builder --driver docker-container --use || error "Failed to create buildx builder"
    else
        info "Using existing multiarch-builder."
        docker buildx use multiarch-builder
    fi
    
    docker buildx inspect --bootstrap || error "Failed to bootstrap buildx builder"
fi

# Check what platforms are supported
info "Checking supported platforms..."
PLATFORMS=$(docker buildx inspect | grep "Platforms:" | sed 's/Platforms: //')
info "Your system can build for: ${YELLOW}$PLATFORMS${NC}"

# Determine target architecture
if [[ "$CURRENT_ARCH" == "x86_64" ]]; then
    TARGET_ARCH="linux/arm64"
    TARGET_NAME="ARM64"
elif [[ "$CURRENT_ARCH" == "arm64" ]] || [[ "$CURRENT_ARCH" == "aarch64" ]]; then
    TARGET_ARCH="linux/amd64"
    TARGET_NAME="AMD64"
else
    TARGET_ARCH="linux/amd64"
    TARGET_NAME="AMD64"
fi

info "Will test building for ${YELLOW}$TARGET_NAME${NC} architecture"

# Test builder container
echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}  Testing 'builder' container build         ${NC}"
echo -e "${BLUE}============================================${NC}"

info "Attempting to build the builder container for $TARGET_NAME architecture..."
if docker buildx build --platform=$TARGET_ARCH \
    --progress=plain \
    --load \
    -t sf2lv2-builder-test:latest \
    -f docker/Dockerfile \
    --target builder \
    . ; then
    success "Builder container successfully built for $TARGET_NAME architecture!"
else
    error "Failed to build the builder container for $TARGET_NAME architecture. Check the error messages above."
fi

# Test backend container
echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}  Testing 'backend' container build         ${NC}"
echo -e "${BLUE}============================================${NC}"

info "Attempting to build the backend container for $TARGET_NAME architecture..."
if docker buildx build --platform=$TARGET_ARCH \
    --progress=plain \
    --load \
    -t sf2lv2-backend-test:latest \
    -f backend/Dockerfile \
    . ; then
    success "Backend container successfully built for $TARGET_NAME architecture!"
else
    error "Failed to build the backend container for $TARGET_NAME architecture. Check the error messages above."
fi

# Overall result
echo -e "\n${BLUE}============================================${NC}"
echo -e "${GREEN}  Both containers built successfully!       ${NC}"
echo -e "${BLUE}============================================${NC}"
info "Your Docker images should build correctly on $TARGET_NAME servers."
info "This is a good indication that your deployment will work on your VPS."
echo ""
warning "Note: This test doesn't guarantee the containers will run perfectly, but it confirms they can be built."
info "To remove the test images, run: docker rmi sf2lv2-builder-test:latest sf2lv2-backend-test:latest"

exit 0 