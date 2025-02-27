#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Cleaning up SF2LV2-WEB directory structure...${NC}"

# Remove duplicate sf2lv2 directories
if [ -d "docker/sf2lv2" ]; then
    echo -e "${RED}Removing duplicate sf2lv2 in docker/...${NC}"
    rm -rf docker/sf2lv2
fi

# Clean build artifacts
echo "Cleaning build artifacts..."
rm -rf **/build/
rm -rf **/dist/
rm -rf backend/plugins/temp/*
rm -rf backend/plugins/uploads/*

# Ensure correct directory structure exists
mkdir -p backend/plugins/{temp,uploads}

echo -e "${GREEN}Cleanup complete!${NC}" 