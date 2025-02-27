#!/bin/bash

# Colors for pretty output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print a colorful banner
echo -e "${BLUE}"
echo "  ____  _____ ___  _     __     ______   __        ________ ____  "
echo " / ___||  ___|__ \| |    \ \   / /___ \ / /_      |__  /__ \  _ \ "
echo " \___ \| |_    / /| |     \ \ / /  __) | '_ \       / /  / / |_) |"
echo "  ___) |  _|  |_| | |___   \ V /  / __/| (_) |     / /_ / /|  __/ "
echo " |____/|_|    (_) |_____|   \_/  |_____|\__\_\    /____|____|_|   "
echo -e "${NC}"
echo -e "${YELLOW}Interactive Deployment Script${NC}"
echo -e "${YELLOW}===============================${NC}\n"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to display step information
step() {
    echo -e "${GREEN}[Step $1]${NC} $2"
}

# Function to display error and exit
error() {
    echo -e "${RED}[Error]${NC} $1"
    exit 1
}

# Function to display warning
warning() {
    echo -e "${YELLOW}[Warning]${NC} $1"
}

# Function to display info
info() {
    echo -e "${BLUE}[Info]${NC} $1"
}

# Function to prompt for confirmation
confirm() {
    while true; do
        read -p "$1 [y/n]: " yn
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes (y) or no (n).";;
        esac
    done
}

# Check if script is being run as root
if [ "$EUID" -ne 0 ]; then 
    warning "This script is not being run as root. Some commands might fail."
    if ! confirm "Continue anyway?"; then
        exit 1
    fi
fi

# Check prerequisite tools
step "1" "Checking prerequisites"

# Check if Docker is installed and running
if ! command_exists docker; then
    error "Docker is not installed. Please install Docker first."
fi

# Check if docker-compose plugin is installed
if ! docker compose version > /dev/null 2>&1; then
    error "Docker Compose plugin is not installed. Please install Docker Compose plugin first."
fi

echo -e "Docker: ${GREEN}OK${NC}"
echo -e "Docker Compose: ${GREEN}OK${NC}"

# Get domain information
step "2" "Setting up domain configuration"
read -p "Enter the domain name (default: sf2lv2.islainstruments.com): " DOMAIN_NAME
DOMAIN_NAME=${DOMAIN_NAME:-sf2lv2.islainstruments.com}

# Detect server architecture
ARCH=$(uname -m)
info "Detected architecture: $ARCH"
if [[ "$ARCH" == "arm64" ]] || [[ "$ARCH" == "aarch64" ]]; then
    warning "You are running on ARM64 architecture. Make sure Docker images support this architecture."
fi

# Prepare the environment
step "3" "Preparing directories and permissions"

# Create necessary directories
mkdir -p temp
chmod 777 temp
echo -e "Directories: ${GREEN}OK${NC}"

# Update the docker-compose.prod.yml file
step "4" "Configuring docker-compose.prod.yml"

# Backup original file
cp docker-compose.prod.yml docker-compose.prod.yml.bak

# Update the FRONTEND_URL environment variable
sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN_NAME|g" docker-compose.prod.yml

echo -e "Configuration: ${GREEN}OK${NC}"

# Build the frontend
step "5" "Building the frontend"
info "This may take a few minutes..."

cd frontend
if ! command_exists npm; then
    warning "npm is not installed. Skipping frontend build. You will need to build it manually."
else
    npm install
    npm run build
    echo -e "Frontend build: ${GREEN}OK${NC}"
fi
cd ..

# Build and start Docker containers
step "6" "Building and starting Docker containers"
info "This may take a while, especially when building the first time..."

if confirm "Would you like to build and start the Docker containers now?"; then
    docker compose -f docker-compose.prod.yml build --no-cache
    docker compose -f docker-compose.prod.yml up -d
    echo -e "Docker containers: ${GREEN}OK${NC}"
else
    info "Skipping Docker container build. You can do this later with:"
    info "docker compose -f docker-compose.prod.yml build --no-cache"
    info "docker compose -f docker-compose.prod.yml up -d"
fi

# CyberPanel configuration guidance
step "7" "CyberPanel configuration"
echo -e "${YELLOW}CyberPanel Configuration Instructions:${NC}"
echo "1. Log in to your CyberPanel dashboard"
echo "2. Go to 'Websites' → 'Create Website'"
echo "3. Create a new website for: $DOMAIN_NAME"
echo "4. Under 'Websites' → 'List Websites', click 'Manage' for $DOMAIN_NAME"
echo "5. Go to 'File Manager' and delete any default files in public_html"
echo "6. Upload the contents of frontend/dist/ to public_html"
echo "7. Go to 'Rewrite Rules' and add this rule:"
echo ""
echo "   RewriteEngine On"
echo "   RewriteRule ^/api/(.*) http://localhost:4001/api/\$1 [P,L]"
echo ""
echo "8. Go to 'SSL' section and issue a Let's Encrypt SSL certificate"

# Verification
step "8" "Verification"
if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${GREEN}Docker containers are running!${NC}"
    echo -e "Once you've completed the CyberPanel configuration, your application should be accessible at:"
    echo -e "${GREEN}https://$DOMAIN_NAME${NC}"
else
    warning "Docker containers are not running. Check the logs with:"
    warning "docker compose -f docker-compose.prod.yml logs"
fi

# Finishing up
echo -e "\n${BLUE}=== Deployment Summary ===${NC}"
echo -e "Domain name: ${GREEN}$DOMAIN_NAME${NC}"
echo -e "Backend API: ${GREEN}http://localhost:4001${NC}"
echo -e "Frontend: ${GREEN}./frontend/dist/${NC}"
echo -e "Docker config: ${GREEN}docker-compose.prod.yml${NC}"

echo -e "\n${YELLOW}Important Notes:${NC}"
echo "1. Make sure to set up the CyberPanel website as described above"
echo "2. Ensure you've set up DNS records for $DOMAIN_NAME"
echo "3. For troubleshooting, refer to DEPLOYMENT.md"

echo -e "\n${GREEN}Deployment script completed!${NC}" 