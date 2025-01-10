# SF2LV2 Web

A web service that allows users to convert SoundFont (.sf2) files into LV2 plugins directly from their web browser. This is the web version of [SF2LV2](https://github.com/islainstruments/SF2LV2).

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
sf2lv2-web/
├── frontend/    # React application for file upload and download
├── backend/     # Node.js server handling conversion requests
└── docker/      # Build environment container
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