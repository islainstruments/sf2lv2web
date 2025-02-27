#!/bin/bash

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check arguments
if [ "$#" -ne 2 ]; then
    log "Error: Incorrect number of arguments"
    log "Usage: $0 <soundfont.sf2> <plugin_name>"
    exit 1
fi

SF2_FILE="$1"
PLUGIN_NAME="$2"

# Verify input file exists
if [ ! -f "/input/$SF2_FILE" ]; then
    log "Error: Input file /input/$SF2_FILE not found"
    ls -la /input/
    exit 1
fi

# Create plugin directory structure with clean paths
log "Creating plugin directory structure..."
mkdir -p "/build/${PLUGIN_NAME}.lv2"

# Define consistent plugin directory path - avoid any double slashes
PLUGIN_DIR="/build/${PLUGIN_NAME}.lv2"

# Create sf2lv2 build directory too - important for the build process
mkdir -p "/build/sf2lv2/build/${PLUGIN_NAME}.lv2"
SF2LV2_PLUGIN_DIR="/build/sf2lv2/build/${PLUGIN_NAME}.lv2"

# Copy soundfont file to both locations to ensure it's found
log "Copying soundfont file to plugin directories..."
cp "/input/$SF2_FILE" "${PLUGIN_DIR}/soundfont.sf2" 
cp "/input/$SF2_FILE" "${SF2LV2_PLUGIN_DIR}/soundfont.sf2"
# Also copy to sf2lv2 directory for build process
cp "/input/$SF2_FILE" "/build/sf2lv2/soundfont.sf2"

# Verify the soundfont was copied correctly
if [ ! -f "${PLUGIN_DIR}/soundfont.sf2" ]; then
    log "Error: Failed to copy soundfont file to ${PLUGIN_DIR}"
    exit 1
fi

if [ ! -f "${SF2LV2_PLUGIN_DIR}/soundfont.sf2" ]; then
    log "Error: Failed to copy soundfont file to ${SF2LV2_PLUGIN_DIR}"
    exit 1
fi

# Log the directories for debugging
log "Directory structure:"
ls -la /build/
ls -la "${PLUGIN_DIR}"
ls -la "/build/sf2lv2"
ls -la "${SF2LV2_PLUGIN_DIR}" || echo "SF2LV2 plugin directory not yet created"

# Build the plugin
log "Building plugin for AARCH64..."
cd /build/sf2lv2

# Clean any previous builds
make clean

# Debug: Echo important variables
log "Debug: SF2_FILE = ${SF2_FILE}"
log "Debug: PLUGIN_NAME = ${PLUGIN_NAME}"

# Build directly with build_plugin target
# Set a fixed soundfont filename "soundfont.sf2" rather than using the timestamped name
make build_plugin \
    CROSS_COMPILE=aarch64-linux-gnu- \
    CC=${CROSS_COMPILE}gcc \
    PLUGIN_NAME="$PLUGIN_NAME" \
    SF2_FILE="soundfont.sf2" \
    CFLAGS="-I/usr/aarch64-linux-gnu/include -DSF2_FILE=\\\"soundfont.sf2\\\"" \
    LDFLAGS="-L/usr/aarch64-linux-gnu/lib -lfluidsynth" || {
    log "Error: Build failed"
    exit 1
}

# Verify plugin was built
if [ ! -d "${SF2LV2_PLUGIN_DIR}" ]; then
    log "Error: Plugin directory not created by build"
    exit 1
fi

# Check the plugin binary for SF2_FILE definition
log "Checking plugin binary for SF2_FILE definition:"
strings "${SF2LV2_PLUGIN_DIR}/${PLUGIN_NAME}.so" | grep -E 'SF2_FILE|undefined|soundfont' || {
    log "Warning: Could not find SF2_FILE string in plugin binary"
}

# Copy all plugin files from SF2LV2 build directory to main plugin directory
log "Copying plugin files from sf2lv2 build directory to main plugin directory..."
cp -r "${SF2LV2_PLUGIN_DIR}"/* "${PLUGIN_DIR}/" || {
    log "Error: Failed to copy plugin files"
    exit 1
}

# Verify essential plugin files exist
log "Verifying essential plugin files..."
MISSING_FILES=0

# Check for .so file
if [ ! -f "${PLUGIN_DIR}/${PLUGIN_NAME}.so" ]; then
    log "Error: Plugin binary (${PLUGIN_NAME}.so) not found in plugin directory"
    MISSING_FILES=1
fi

# Check for TTL files
if [ ! -f "${PLUGIN_DIR}/manifest.ttl" ]; then
    log "Error: manifest.ttl not found in plugin directory"
    MISSING_FILES=1
fi
if [ ! -f "${PLUGIN_DIR}/${PLUGIN_NAME}.ttl" ]; then
    log "Error: ${PLUGIN_NAME}.ttl not found in plugin directory"
    MISSING_FILES=1
fi

# Check for soundfont file
if [ ! -f "${PLUGIN_DIR}/soundfont.sf2" ]; then
    log "Error: soundfont.sf2 not found in plugin directory"
    MISSING_FILES=1
fi

if [ $MISSING_FILES -eq 1 ]; then
    log "Critical plugin files are missing. Build failed."
    exit 1
fi

# Print plugin directory contents for debugging
log "Plugin directory contents:"
ls -la "${PLUGIN_DIR}"

# Add detailed debugging before creating the zip file
log "Checking for existing zip files in the build directory..."
find /build -name "*.zip" | xargs -r ls -la
log "Detailed listing of the plugin directory structure:"
find "${PLUGIN_DIR}" -type f | sort

# Create zip file
log "Creating zip archive..."
cd /build
zip -r "/output/${PLUGIN_NAME}.zip" "${PLUGIN_NAME}.lv2" || {
    log "Error: Failed to create zip archive"
    exit 1
}

# Also debug the contents of the zip file
log "Zip file contents:"
unzip -l "/output/${PLUGIN_NAME}.zip"

log "Build completed successfully"
log "Plugin has been saved to /output/${PLUGIN_NAME}.zip"

# This script likely handles:
# 1. Mounting the soundfont file
# 2. Triggering the build process
# 3. Copying the built plugin to the output location 