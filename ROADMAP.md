# SF2LV2 Sfumato Enhancement Plan

## 1. Voice Architecture
- Each voice (triggered sample) requires its own complete audio processing chain
- Multiple voices can be triggered per note (layered samples from different zones)
- Basic chain structure per voice:
```
source -> filter -> amplifier -> panner -> destination
   ^         ^         ^
   |         |         |
   LFO   ModEnv    VolEnv
```

## 2. Generator Implementation
### Core Generators to Implement (from generators.ts):
```typescript
// LFO Controls
modLfoToPitch      // Generator 5
vibLfoToPitch      // Generator 6
modLfoToFilterFc   // Generator 10
modLfoToVolume     // Generator 13
delayModLFO        // Generator 21
freqModLFO         // Generator 22
delayVibLFO        // Generator 23
freqVibLFO         // Generator 24

// Filter Controls
initialFilterFc     // Generator 8
initialFilterQ      // Generator 9
modEnvToFilterFc    // Generator 11

// Modulation Envelope
delayModEnv        // Generator 25
attackModEnv       // Generator 26
holdModEnv         // Generator 27
decayModEnv        // Generator 28
sustainModEnv      // Generator 29
releaseModEnv      // Generator 30
```

## 3. Web Audio API Node Mapping
### Required Nodes per Voice:
- `OscillatorNode` for LFOs
- `BiquadFilterNode` for filters
- `GainNode` for volume control
- `StereoPannerNode` for panning
- Custom envelope processors for both volume and modulation

## 4. Implementation Locations

### A. Primary Implementation in applyOptions:
```typescript
export function applyOptions(ctx, source, options) {
  // 1. Create base nodes
  const filter = ctx.createBiquadFilter();
  const amplifier = ctx.createGain();
  const panner = ctx.createStereoPanner();
  
  // 2. Create and configure LFOs
  const modLFO = ctx.createOscillator();
  const vibLFO = ctx.createOscillator();
  
  // 3. Create modulation routing nodes
  const modLFOGain = ctx.createGain();
  const vibLFOGain = ctx.createGain();
  
  // 4. Set up envelopes
  const volEnv = createEnvelope(/* volume envelope params */);
  const modEnv = createEnvelope(/* mod envelope params */);
  
  // 5. Connect chain
  source.connect(filter);
  filter.connect(amplifier);
  amplifier.connect(panner);
  panner.connect(ctx.destination);
}
```

### B. Modulator Handling:
- Create new module `modulators.ts` to handle MIDI CC routing
- Implement modulator data structure based on SF2 spec:
```typescript
interface SFModulator {
  source: number;      // MIDI CC number
  destination: number; // Generator target
  amount: number;      // Scaling factor
  transform: number;   // Value transformation type
}
```

## 5. Parameter Ranges and Scaling

### Filter Parameters:
- Frequency: 20Hz - 20kHz (logarithmic scaling)
- Q: 0.0 - 10.0 (linear scaling)

### Envelope Times:
- Convert timecents to seconds: `tc2s(timecents)`
- Default values (in timecents):
  - Attack: -12000
  - Hold: -12000
  - Decay: -12000
  - Release: -12000

### LFO Parameters:
- Frequency: 0.1Hz - 20Hz
- Depth: 0.0 - 1.0 (scaled based on destination)

## 6. Implementation Phases

### Phase 1: Basic Voice Structure
- Implement complete per-voice audio chain
- Basic envelope handling
- Filter implementation

### Phase 2: LFO Implementation
- Add LFO nodes
- Configure routing to pitch/filter/volume
- Implement delay and frequency controls

### Phase 3: Modulator Routing
- Parse IMOD chunk data
- Implement MIDI CC handling
- Create modulation matrix

### Phase 4: Performance Optimization
- Voice pooling
- Node reuse strategies
- CPU usage optimization

## 7. Testing Strategy
- Create test soundfonts with known modulator configurations
- Implement automated tests for envelope shapes
- Compare output with FluidSynth reference
- Test multi-voice scenarios
- Verify MIDI CC response curves

## 8. Key Challenges to Address
1. Efficient handling of multiple simultaneous voices
2. Accurate timing of envelope and LFO parameters
3. Proper scaling of modulation amounts
4. CPU-efficient modulator routing
5. Handling of layered samples with different modulator configurations

## 9. Future Considerations
- Support for additional generator types
- Extended modulator transformations
- Performance profiling and optimization
- WebAssembly acceleration for complex processing 