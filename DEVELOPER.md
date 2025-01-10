# Developer Documentation

## Project Overview
SF2LV2 Web is a React-based web application for converting SoundFont (.sf2) files into LV2 plugins. The application features a real-time preview system with MIDI support, effects processing, and an interactive interface.

## Key Components

### Audio Engine
- Uses `sfumato` library for SoundFont loading and playback
- Integrated with Web Audio API for real-time audio processing
- Supports MIDI input through WebMidi API

### Effects Panel (`EffectsPanel.tsx`)
The effects panel provides real-time control over audio processing parameters using a custom knob interface.

#### Custom Knob Implementation
- Canvas-based rendering for smooth visual feedback
- Mouse-based interaction with vertical drag control
- Precise value stepping with configurable sensitivity
- Visual feedback includes:
  - Background arc showing full range
  - Colored arc showing current value
  - White indicator line
  - Numerical value display

#### Reverb Parameters
All parameters are controlled through the `smplr` Reverb module:
- Pre-Delay (0-22050 samples)
- Bandwidth (0-1)
- Input Diffusion 1 & 2 (0-1)
- Decay (0-1)
- Decay Diffusion 1 & 2 (0-0.999999)
- Damping (0-1)
- Excursion Rate (0-2)
- Excursion Depth (0-2)
- Wet/Dry Mix (0-1)

### Piano Keyboard (`PianoKeyboard.tsx`)
- Interactive piano keyboard interface (C2 to C6 range)
- Supports both mouse and MIDI input
- Visual feedback for active notes
- Integrated with SoundFont playback

### MIDI Implementation
- Automatic MIDI device detection and connection
- Real-time note input handling
- Velocity sensitivity support
- Program change support for preset switching

## State Management
- React hooks for component-level state
- Real-time parameter updates through refs
- Audio parameter synchronization with UI state

## Recent Updates

### Effects Panel Improvements (Latest)
The knob implementation has been significantly improved:
- Fixed mouse tracking for precise vertical movement control
- Added proper event cleanup to prevent memory leaks
- Implemented user selection prevention during dragging
- Added step-based value updates for precise control
- Improved visual feedback with dual-arc system
- Added numerical display of current values
- Fixed value constraints and validation

### Audio Engine Updates
- Successfully transitioned from `soundfont2` to `sfumato` library
- Improved reverb parameter handling with `smplr`
- Enhanced real-time parameter updates
- Better synchronization between UI state and audio engine

### Knob Implementation Details
The custom knob component now features:
1. Mouse Event Handling:
   - Tracks vertical movement for value changes
   - Uses refs to store drag state and initial values
   - Proper cleanup of event listeners
   - Prevents text selection during dragging

2. Value Management:
   - Step-based value updates for precision
   - Proper min/max constraints
   - Formatted value display
   - Smooth value transitions

3. Visual Rendering:
   - Background arc for full range
   - Colored arc for current value
   - White indicator line
   - Numerical value display
   - Canvas-based rendering for performance

4. Parameter Synchronization:
   - Immediate UI updates
   - Real-time audio parameter updates
   - Proper cleanup on unmount

### Technical Implementation
The knob interface uses a custom implementation rather than third-party libraries:
- Pure Canvas API for rendering
- Native mouse event handling
- Custom math for arc calculations and value mapping
- React refs for performance-critical state
- No external dependencies

This approach was chosen over libraries like `react-rotary-knob` or others because:
1. Better control over the exact behavior and appearance
2. More efficient rendering with direct canvas manipulation
3. Tighter integration with audio parameter updates
4. No additional dependencies to manage
5. Custom sensitivity and step handling for audio parameters

The implementation lives in the `Knob` component within `EffectsPanel.tsx` and handles:
- Canvas drawing and updates
- Mouse event capture and processing
- Value normalization and constraints
- Visual feedback rendering
- Audio parameter synchronization

## Development Guidelines

### Adding New Effects
1. Define parameter ranges and step values
2. Create appropriate UI controls
3. Implement audio processing connection
4. Add real-time parameter update handling

### Modifying Knob Behavior
1. Update `KnobProps` interface if adding new properties
2. Modify `handleMouseMove` for interaction changes
3. Update `drawKnob` for visual changes
4. Ensure proper cleanup in `useEffect`

### Testing
- Test parameter ranges extensively
- Verify smooth interaction on different devices
- Check audio processing performance
- Ensure proper cleanup of resources

## Known Issues & Future Improvements
1. Consider adding touch support for mobile devices
2. Potential optimization of canvas rendering
3. Add parameter automation support
4. Consider adding preset system for effect parameters

## Dependencies
- React
- Web Audio API
- WebMidi API
- sfumato (SoundFont playback)
- smplr (Audio effects) 

## Sfumato Development
The project uses a local version of the sfumato library for SoundFont playback. When making changes to sfumato:

1. Source files are in `frontend/sfumato/src/*.ts`
2. After any changes to the TypeScript source files, you MUST rebuild the library:
   ```bash
   cd frontend/sfumato
   npm run build
   ```
3. The build process will update the compiled files in `frontend/sfumato/dist/`
4. Changes to TypeScript files will not take effect until you rebuild

### Important Note
The compiled files in `dist/` (sfumato.js, sfumato.umd.cjs) are what actually gets used by the application. Changes to the TypeScript source files alone will not affect the application's behavior until you rebuild the library. 