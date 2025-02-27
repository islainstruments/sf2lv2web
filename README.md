# SF2LV2-WEB

A web service that converts SoundFont (.sf2) files into LV2 plugins through a containerized build process.

## System Architecture

### Components
1. **Frontend** (React)
   - Handles file upload UI
   - Provides soundfont preview
   - Manages download of built plugins

2. **Backend** (Node.js)
   - Manages file uploads
   - Coordinates with Docker builder
   - Handles plugin downloads

3. **Builder** (Docker)
   - Cross-compiles plugins for ARM64
   - Contains FluidSynth and LV2 dependencies
   - Generates plugin binaries and metadata

## File Flow

1. **Upload Stage**
   ```
   User Upload → Frontend → Backend → /backend/plugins/uploads/
   ```

2. **Build Stage**
   ```
   /backend/plugins/uploads/ → Docker Volume → /input/
   ↓
   Docker builds plugin in /build/sf2lv2/
   ↓
   Output saved to /output/ → /backend/plugins/temp/
   ```

3. **Download Stage**
   ```
   /backend/plugins/temp/ → Backend → Frontend → User Download
   ```

## Directory Structure
```
.
├── frontend/              # React frontend
├── backend/
│   └── plugins/
│       ├── uploads/       # Uploaded soundfonts
│       └── temp/         # Built plugins
├── docker/
│   ├── Dockerfile        # Builder image definition
│   └── build.sh          # Build process script
└── sf2lv2/              # Plugin source code
    ├── src/             # C source files
    └── Makefile         # Build system
```

## Build Process

1. **File Upload**
   - Frontend sends file to backend
   - Backend stores in `/backend/plugins/uploads/`

2. **Build Trigger**
   - Backend executes Docker builder
   - Mounts:
     - `/backend/plugins/uploads/` → `/input/`
     - `/backend/plugins/temp/` → `/output/`
     - `/sf2lv2/` → `/build/sf2lv2/`

3. **Plugin Generation**
   - Builder runs `/build/build.sh`
   - Compiles using sf2lv2 source
   - Generates LV2 bundle
   - Creates ZIP archive in `/output/`

4. **Download**
   - Backend serves ZIP from `/backend/plugins/temp/`
   - Frontend provides download link

## Volume Mappings

From docker-compose.yml:
```yaml
volumes:
  - ./sf2lv2:/build/sf2lv2        # Plugin source
  - ./backend/plugins/uploads:/input    # Soundfont input
  - ./backend/plugins/temp:/output      # Built plugin output
```

## Build Environment

The Docker builder:
1. Uses Debian Bookworm base
2. Cross-compiles for ARM64 (aarch64)
3. Includes:
   - FluidSynth 2.4.1
   - LV2 development files
   - Cross-compilation toolchain

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build Docker image:
   ```bash
   docker-compose build
   ```

3. Start services:
   ```bash
   docker-compose up
   ```

4. Access frontend at `http://localhost:3000`

## Overview

SF2LV2 Web provides a simple, user-friendly interface for musicians and producers to convert their SoundFont files into LV2 plugins. Users can:

1. Upload any .sf2 file through their web browser
2. Preview the SoundFont's contents:
   - Interactive piano keyboard interface
   - Real-time soundfont playback
   - MIDI device support
   - Full preset browser with bank and program selection
   - Visual feedback for active notes
3. Generate an LV2 plugin with all the features of the command-line SF2LV2:
   - MIDI input support
   - Stereo audio output
   - Real-time control over Filters and Envelopes
   - Full preset name display
   - Bank and program change support
4. Download the compiled LV2 plugin, ready to use in any LV2 host

The service handles all the complexity of plugin compilation, dependency management, and build processes behind the scenes, making it accessible to users regardless of their technical expertise.

## Features

### SoundFont Preview
- Interactive piano keyboard (C2 to C6 range)
- Real-time soundfont playback using Web Audio API
- Full preset browser with bank and program selection
- Visual feedback for active notes
- Mouse and touch support for playing notes
- Drag functionality across keys

### MIDI Support
- WebMidi API integration
- Multiple MIDI input device support
- Real-time note playback with velocity
- Automatic device detection
- Connection/disconnection handling
- Real-time preset switching

### Audio Engine
- High-quality soundfont playback
- Sample-accurate timing
- Proper note envelope handling
- Efficient memory management
- Automatic audio context handling

## How It Works

1. **Upload**: Users drag and drop or select their .sf2 file
2. **Validation**: The service checks the file format and content
3. **Preview**: Users can see the SoundFont's presets and structure
4. **Build**: The service compiles the LV2 plugin in a secure container
5. **Download**: Users receive their ready-to-use LV2 plugin

## Project Structure

```
SF2LV2-WEB/
├── sf2lv2/           # Main plugin source code
│   ├── src/          # Plugin source files
│   └── Makefile      # Build system
│
├── docker/           # Docker build environment
│   ├── Dockerfile    # Cross-compilation setup
│   └── build.sh      # Build process script
│
├── backend/          # Node.js backend
│   └── plugins/      # Plugin build output
│       ├── temp/     # Temporary files
│       └── uploads/  # Soundfont uploads
│
└── frontend/         # React frontend
```

## Development Setup

### Prerequisites
- Node.js (v16 or later)
- Docker
- Git

### Components

1. **Frontend**
   - React-based web interface
   - Drag-and-drop file upload
   - Progress tracking
   - Plugin download
   - SoundFont preview functionality

2. **Backend**
   - Node.js/Express server
   - File handling and validation
   - Build queue management
   - Download management
   - Security and rate limiting

3. **Build Container**
   - Debian-based Docker container
   - FluidSynth and LV2 dependencies
   - Automated build process
   - Secure execution environment

## Getting Started

Instructions coming soon...

## Security Features

- File type validation
- Size limits on uploads
- Secure, isolated build environment
- Rate limiting for API endpoints
- Temporary file cleanup
- Secure download links

## License

MIT License - See LICENSE file for details.

## Credits

Created by Isla Instruments ([www.islainstruments.com](https://www.islainstruments.com)) 