import React, { useEffect, useRef, useState, MouseEvent as ReactMouseEvent, useCallback } from 'react';
import { WebMidi, Input, NoteMessageEvent } from 'webmidi';
import { Synthetizer, Preset } from '../types';
import '../styles/PianoKeyboard.css';
import islaLogo from '../assets/isla-logo.png';

// MIDI CC numbers
const CC = {
    FILTER_CUTOFF: 74,
    FILTER_RESONANCE: 71,
    ATTACK_TIME: 73,
    DECAY_TIME: 75,
    SUSTAIN_LEVEL: 70,
    RELEASE_TIME: 72,
    MOD_WHEEL: 1,
    TREMOLO: 92,
    MOD_ENV_TO_FILTER: 79,
    REVERB_LEVEL: 91,
    CHORUS_LEVEL: 93,
    VOLUME: 7,
    MOD_ENV_DELAY: 82,
    MOD_ENV_ATTACK: 83,
    MOD_ENV_HOLD: 84,
    MOD_ENV_DECAY: 85,
    MOD_ENV_SUSTAIN: 86,
    MOD_ENV_RELEASE: 87
};

interface PianoKeyboardProps {
  synth: Synthetizer;
  selectedPreset: Preset | null;
}

interface KnobProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: number;
  color?: string;
  sensitivity?: number;
  label: string;
  step?: number;
}

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  onChangeEnd?: () => void;
  color?: string;
  label: string;
  springLoaded?: boolean;
}

interface MidiMessage {
  event: any;  // The raw MIDI event
  timestamp: number;
}

interface LCDProps {
  line1: string;
  line2: string;
  width?: string;
  height?: string;
  backlit?: boolean;
  midiMessage?: MidiMessage | null;
}

interface ArpeggiatorState {
  isOn: boolean;
  rate: '1/4' | '1/8' | '1/16';
  direction: 'up' | 'down' | 'updown' | 'random';
  octaveRange: number;
  hold: boolean;
  bpm: number;
}

interface ArpNote {
  note: number;
  velocity: number;
  timestamp: number;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const START_OCTAVE = 1;
const NUM_OCTAVES = 4;

// Message display system
type MessageType = 'MIDI' | 'PARAMETER' | 'PRESET' | 'TEMPORARY';
interface DisplayMessage {
  line1: string;
  line2: string;
  type: MessageType;
  timestamp: number;
}

// Helper functions
const formatMidiMessage = (event: any): { line1: string, line2: string } => {
  if (event.type === 'noteon') {
    return {
      line1: `Note On: ${event.note.name}${event.note.octave}`,
      line2: `Velocity: ${Math.round(event.velocity * 127)}`
    };
  } else if (event.type === 'noteoff') {
    return {
      line1: `Note Off: ${event.note.name}${event.note.octave}`,
      line2: ''
    };
  } else if (event.type === 'controlchange') {
    const ccNames: { [key: number]: string } = {
      1: 'MOD WHEEL',
      74: 'CUTOFF',
      71: 'RESONANCE',
      73: 'ATTACK',
      75: 'DECAY',
      70: 'SUSTAIN',
      72: 'RELEASE',
      91: 'REVERB',
      93: 'CHORUS',
      7: 'VOLUME'
    };
    const ccNumber = event.controller.number;
    const ccValue = Math.round(event.value * 127);
    const ccName = ccNames[ccNumber];
    
    return {
      line1: `CC ${ccNumber}: ${ccValue}`,
      line2: ccName || ''
    };
  } else if (event.type === 'pitchbend') {
    const bendValue = event.value.toFixed(2);
    return {
      line1: `Pitch Bend: ${bendValue}`,
      line2: ''
    };
  }
  return {
    line1: event.type.toUpperCase(),
    line2: ''
  };
};

// Helper functions
const lcdAlignCenter = (text: string, size = 16) => {
  return text.substr(0, size);
};

// Component definitions
const Knob: React.FC<KnobProps> = ({
  value,
  onChange,
  min = 0,
  max = 127,
  size = 30,
  color = '#ff4444',
  sensitivity = 0.5,
  label,
  step = 1
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;

    const deltaY = (startY.current - e.clientY) * sensitivity;
    const range = max - min;
    const deltaValue = (deltaY / 100) * range;
    const newValue = Math.min(max, Math.max(min, startValue.current + deltaValue));
    const steppedValue = Math.round(newValue / step) * step;
    
    onChange(steppedValue);
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startValue.current = value;
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const drawKnob = (ctx: CanvasRenderingContext2D) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.4;
    const startAngle = -Math.PI * 0.75;
    const endAngle = Math.PI * 0.75;
    const currentAngle = startAngle + (endAngle - startAngle) * ((value - min) / (max - min));

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = size * 0.1;
    ctx.stroke();

    // Draw value arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, currentAngle);
    ctx.strokeStyle = color;
    ctx.stroke();

    // Draw indicator line
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(currentAngle) * radius,
      centerY + Math.sin(currentAngle) * radius
    );
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    drawKnob(ctx);

    return () => {
      if (isDragging.current) {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [value, size, color]);

  return (
    <div className="knob-container">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        style={{ cursor: 'pointer' }}
      />
      <div className="knob-label">{label}</div>
      <div className="knob-value">{value}</div>
    </div>
  );
};

const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  onChangeEnd,
  color = '#ff4444',
  label,
  springLoaded = false
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const newValue = 1 - Math.min(Math.max(y / rect.height, 0), 1);
    onChange(newValue);
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);

    if (springLoaded) {
      onChange(0.5); // Return to center for pitch bend
    }
    if (onChangeEnd) {
      onChangeEnd();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;

    isDragging.current = true;
    const rect = sliderRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const newValue = 1 - Math.min(Math.max(y / rect.height, 0), 1);
    onChange(newValue);
    
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="slider-container">
      <div className="slider-label">{label}</div>
      <div 
        ref={sliderRef}
        className="slider"
        style={{ 
          '--slider-color': color,
          '--slider-value': value
        } as React.CSSProperties}
        onMouseDown={handleMouseDown}
      >
        <div className="slider-track" />
        <div className="slider-thumb" />
      </div>
      <div className="slider-value">{Math.round(value * 127)}</div>
    </div>
  );
};

const LCD: React.FC<LCDProps> = ({ 
  line1, 
  line2, 
  width = "100%", 
  height = "auto", 
  backlit = true
}) => {
  const bgcolor = backlit ? '#111111' : '#000000';
  return (
    <svg className="LCD" viewBox="0 0 78 32" width={width} height={height}>
      <defs>
        <pattern id="characterCell" width="4" height="8" patternUnits="userSpaceOnUse">
          <rect width="3.6" height="7.2" x="0.2" y="0.4" fill="none" stroke="#ff4444" strokeWidth="0.05" strokeOpacity="0.2"/>
          <line x1="0.9" y1="0.4" x2="0.9" y2="7.6" stroke="#ff4444" strokeWidth="0.05" strokeOpacity="0.2"/>
          <line x1="1.6" y1="0.4" x2="1.6" y2="7.6" stroke="#ff4444" strokeWidth="0.05" strokeOpacity="0.2"/>
          <line x1="2.3" y1="0.4" x2="2.3" y2="7.6" stroke="#ff4444" strokeWidth="0.05" strokeOpacity="0.2"/>
          <line x1="3.0" y1="0.4" x2="3.0" y2="7.6" stroke="#ff4444" strokeWidth="0.05" strokeOpacity="0.2"/>
          <line x1="0.2" y1="1.3" x2="3.8" y2="1.3" stroke="#ff4444" strokeWidth="0.05" strokeOpacity="0.2"/>
          <line x1="0.2" y1="2.2" x2="3.8" y2="2.2" stroke="#ff4444" strokeWidth="0.05" strokeOpacity="0.2"/>
          <line x1="0.2" y1="3.1" x2="3.8" y2="3.1" stroke="#ff4444" strokeWidth="0.05" strokeOpacity="0.2"/>
          <line x1="0.2" y1="4.0" x2="3.8" y2="4.0" stroke="#ff4444" strokeWidth="0.05" strokeOpacity="0.2"/>
          <line x1="0.2" y1="4.9" x2="3.8" y2="4.9" stroke="#ff4444" strokeWidth="0.05" strokeOpacity="0.2"/>
          <line x1="0.2" y1="5.8" x2="3.8" y2="5.8" stroke="#ff4444" strokeWidth="0.05" strokeOpacity="0.2"/>
          <line x1="0.2" y1="6.7" x2="3.8" y2="6.7" stroke="#ff4444" strokeWidth="0.05" strokeOpacity="0.2"/>
        </pattern>
      </defs>
      <path
        fill="#333"
        stroke="url(#c)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth=".28"
        d="M3.55 3.19h77.89V34.9H3.55z"
        transform="translate(-3.41 -3.05)"
      />
      <path
        fill="#161616"
        stroke="url(#c)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth=".26"
        d="M5.12 4.33h74.96v29.31H5.12z"
        transform="translate(-3.41 -3.05)"
      />
      <path
        fill="#333"
        stroke="#646464"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity=".3"
        strokeWidth=".28"
        d="M7.51 6.95h70.34v24.42H7.51z"
        transform="translate(-3.41 -3.05)"
      />
      <path
        fill={bgcolor}
        stroke="#000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity=".3"
        strokeWidth=".28"
        d="M8.76 8.3h67.73v21.6H8.76z"
        transform="translate(-3.41 -3.05)"
      />
      <rect x="5.35" y="5.25" width="64" height="21.6" fill="url(#characterCell)" />
      <text
        fill="#ff4444"
        x="12"
        y="17"
        fontFamily="Doto"
        fontWeight="600"
        fontSize="5.5"
        transform="translate(-3.41 -3.05)"
        style={{whiteSpace: 'pre'}}
        filter="url(#glow)"
      >{lcdAlignCenter(line1)}</text>
      <text
        fill="#ff4444"
        x="12"
        y="26"
        fontFamily="Doto"
        fontWeight="600"
        fontSize="5.5"
        transform="translate(-3.41 -3.05)"
        style={{whiteSpace: 'pre'}}
        filter="url(#glow)"
      >{lcdAlignCenter(line2)}</text>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
};

const ArpeggiatorControls: React.FC<{
  state: ArpeggiatorState;
  onChange: (newState: Partial<ArpeggiatorState>) => void;
  onBpmChange?: (bpm: number) => void;
}> = ({ state, onChange, onBpmChange }) => {
  return (
    <div className="arp-controls">
      <div className="arp-toggle-group">
        <div className="arp-toggle">
          <input
            type="checkbox"
            checked={state.isOn}
            onChange={(e) => onChange({ isOn: e.target.checked })}
            className="toggle-switch"
          />
          <span className="arp-header">ARP</span>
        </div>
        <div className="arp-hold">
          <input
            type="checkbox"
            checked={state.hold}
            onChange={(e) => onChange({ hold: e.target.checked })}
            className="toggle-switch"
          />
          <span>HOLD</span>
        </div>
      </div>
      <div className="arp-rates">
        {(['1/4', '1/8', '1/16'] as const).map((rate) => (
          <label key={rate} className="radio-label">
            <input
              type="radio"
              name="rate"
              value={rate}
              checked={state.rate === rate}
              onChange={() => onChange({ rate })}
              className="radio-input"
            />
            <span>{rate}</span>
          </label>
        ))}
      </div>
      <div className="arp-directions">
        {([
          { value: 'up', label: '↑' },
          { value: 'down', label: '↓' },
          { value: 'updown', label: '↕' },
          { value: 'random', label: '?' }
        ] as const).map(({ value, label }) => (
          <label key={value} className="radio-label">
            <input
              type="radio"
              name="direction"
              value={value}
              checked={state.direction === value}
              onChange={() => onChange({ direction: value })}
              className="radio-input"
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <div className="arp-octave">
        <Knob
          value={state.octaveRange}
          onChange={(value) => onChange({ octaveRange: value })}
          min={1}
          max={3}
          size={30}
          label="OCT"
          step={1}
        />
      </div>
      <div className="arp-bpm">
        <Knob
          value={state.bpm}
          onChange={(value) => {
            if (onBpmChange) {
              onBpmChange(value);
            }
            onChange({ bpm: value });
          }}
          min={60}
          max={200}
          size={30}
          label="BPM"
          step={1}
        />
      </div>
    </div>
  );
};

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({ synth, selectedPreset }) => {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const activeNotesRef = useRef<Set<number>>(new Set());
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [midiInputs, setMidiInputs] = useState<Input[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('');

  // Filter state
  const [filterCutoff, setFilterCutoff] = useState(127);    // fully open by default
  const [filterResonance, setFilterResonance] = useState(0);

  // Envelope state
  const [attackTime, setAttackTime] = useState(64);
  const [decayTime, setDecayTime] = useState(64);
  const [sustainLevel, setSustainLevel] = useState(64);
  const [releaseTime, setReleaseTime] = useState(64);

  // LFO state
  const [lfoRate, setLfoRate] = useState(0);
  const [lfoDepth, setLfoDepth] = useState(0);
  const [modWheel, setModWheel] = useState(0);
  const [tremolo, setTremolo] = useState(0);
  
  // Modulation Envelope state
  const [modEnvToFilter, setModEnvToFilter] = useState(0);
  const [modEnvDelay, setModEnvDelay] = useState(0);
  const [modEnvAttack, setModEnvAttack] = useState(64);
  const [modEnvHold, setModEnvHold] = useState(64);
  const [modEnvDecay, setModEnvDecay] = useState(64);
  const [modEnvSustain, setModEnvSustain] = useState(64);
  const [modEnvRelease, setModEnvRelease] = useState(64);

  // Effects state
  const [reverbLevel, setReverbLevel] = useState(0);
  const [chorusLevel, setChorusLevel] = useState(0);

  // Wheels state
  const [pitchBendValue, setPitchBendValue] = useState(0.5); // Center position
  const [modulationValue, setModulationValue] = useState(0); // Start at zero

  // Add volume state
  const [volume, setVolume] = useState(100); // Start at max volume

  // Add isUpdatingFromMidi flag
  const isUpdatingFromMidi = useRef(false);

  // Add arpeggiator state
  const [arpeggiator, setArpeggiator] = useState<ArpeggiatorState>({
    isOn: false,
    rate: '1/8',
    direction: 'up',
    octaveRange: 1,
    hold: false,
    bpm: 120
  });

  // Add arpeggiator state
  const [heldNotes, setHeldNotes] = useState<ArpNote[]>([]);
  const arpIntervalRef = useRef<number>();
  const currentNoteRef = useRef<number | null>(null);
  const patternIndexRef = useRef(0);

  // Add utility functions for arpeggiator
  const getArpRate = (rate: '1/4' | '1/8' | '1/16'): number => {
    const beatMs = 60000 / arpeggiator.bpm;
    switch (rate) {
      case '1/4': return beatMs;
      case '1/8': return beatMs / 2;
      case '1/16': return beatMs / 4;
    }
  };

  const generateArpPattern = (notes: ArpNote[]): { note: number; velocity: number }[] => {
    if (notes.length === 0) return [];
    
    const sortedNotes = [...notes].sort((a, b) => a.note - b.note);
    const octaveNotes: { note: number; velocity: number }[] = [];
    
    // Generate notes for each octave in range
    for (let octave = 0; octave < arpeggiator.octaveRange; octave++) {
      sortedNotes.forEach(({ note, velocity }) => {
        octaveNotes.push({
          note: note + (octave * 12),
          velocity
        });
      });
    }

    switch (arpeggiator.direction) {
      case 'up':
        return octaveNotes;
      case 'down':
        return octaveNotes.reverse();
      case 'updown':
        return [...octaveNotes, ...octaveNotes.slice(1, -1).reverse()];
      case 'random':
        return octaveNotes.sort(() => Math.random() - 0.5);
    }
  };

  const stopArpeggiator = useCallback(() => {
    if (currentNoteRef.current !== null) {
      synth.noteOff(0, currentNoteRef.current);
      currentNoteRef.current = null;
    }
    if (arpIntervalRef.current) {
      window.clearInterval(arpIntervalRef.current);
      arpIntervalRef.current = undefined;
    }
    patternIndexRef.current = 0;
  }, [synth]);

  const startArpeggiator = useCallback(() => {
    if (!arpeggiator.isOn || heldNotes.length === 0) return;
    
    stopArpeggiator();
    
    const pattern = generateArpPattern(heldNotes);
    if (pattern.length === 0) return;

    const playNext = () => {
      if (currentNoteRef.current !== null) {
        synth.noteOff(0, currentNoteRef.current);
      }

      if (heldNotes.length === 0 && !arpeggiator.hold) {
        stopArpeggiator();
        return;
      }

      const noteToPlay = pattern[patternIndexRef.current];
      synth.noteOn(0, noteToPlay.note, noteToPlay.velocity);
      currentNoteRef.current = noteToPlay.note;
      
      patternIndexRef.current = (patternIndexRef.current + 1) % pattern.length;
    };

    playNext(); // Play first note immediately
    arpIntervalRef.current = window.setInterval(playNext, getArpRate(arpeggiator.rate));
  }, [arpeggiator, heldNotes, synth, stopArpeggiator]);

  // Message display system
  const [currentMessage, setCurrentMessage] = useState<DisplayMessage>({
    line1: selectedPreset?.presetName || 'No Preset',
    line2: selectedPreset ? `Bank ${selectedPreset.bank} • ${selectedPreset.program}` : '',
    type: 'PRESET',
    timestamp: Date.now()
  });

  const messageTimeoutRef = useRef<NodeJS.Timeout>();
  const lastMidiTimestampRef = useRef<number>(0);

  // Function to show a message with proper priority handling
  const showMessage = useCallback((message: Omit<DisplayMessage, 'timestamp'>) => {
    const now = Date.now();

    // Clear any existing timeout
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }

    // Priority and timing rules:
    // 1. MIDI messages within 50ms of each other are batched
    // 2. PARAMETER changes always show and reset timeout
    // 3. TEMPORARY messages (like BPM) always show and reset timeout
    // 4. PRESET is the fallback state

    if (message.type === 'MIDI') {
      // Only update if it's been more than 50ms since last MIDI message
      if (now - lastMidiTimestampRef.current > 50) {
        lastMidiTimestampRef.current = now;
        setCurrentMessage({ ...message, timestamp: now });
      }
    } else {
      setCurrentMessage({ ...message, timestamp: now });
    }

    // Set timeout to return to preset display
    if (message.type !== 'PRESET') {
      messageTimeoutRef.current = setTimeout(() => {
        setCurrentMessage({
          line1: selectedPreset?.presetName || 'No Preset',
          line2: selectedPreset ? `Bank ${selectedPreset.bank} • ${selectedPreset.program}` : '',
          type: 'PRESET',
          timestamp: Date.now()
        });
      }, 2000);
    }
  }, [selectedPreset]);

  // MIDI message handler
  const handleMidiMessage = useCallback((event: any) => {
    const formattedMessage = formatMidiMessage(event);
    showMessage({
      ...formattedMessage,
      type: 'MIDI'
    });

    // Handle MIDI CC messages
    if (event.type === 'controlchange' && typeof event.value === 'number' && typeof event.controller.number === 'number') {
      isUpdatingFromMidi.current = true;
      const midiValue = Math.round(event.value * 127);
      
      // Update UI values based on CC number
      switch (event.controller.number) {
        case CC.MOD_WHEEL:
          setModulationValue(event.value);
          synth.controllerChange(0, CC.MOD_WHEEL, midiValue);
          break;
        case CC.FILTER_CUTOFF:
          setFilterCutoff(midiValue);
          synth.controllerChange(0, CC.FILTER_CUTOFF, midiValue);
          break;
        case CC.FILTER_RESONANCE:
          setFilterResonance(midiValue);
          synth.controllerChange(0, CC.FILTER_RESONANCE, midiValue);
          break;
        case CC.ATTACK_TIME:
          setAttackTime(midiValue);
          synth.controllerChange(0, CC.ATTACK_TIME, midiValue);
          break;
        case CC.DECAY_TIME:
          setDecayTime(midiValue);
          synth.controllerChange(0, CC.DECAY_TIME, midiValue);
          break;
        case CC.SUSTAIN_LEVEL:
          setSustainLevel(midiValue);
          synth.controllerChange(0, CC.SUSTAIN_LEVEL, midiValue);
          break;
        case CC.RELEASE_TIME:
          setReleaseTime(midiValue);
          synth.controllerChange(0, CC.RELEASE_TIME, midiValue);
          break;
        default:
          synth.controllerChange(0, event.controller.number, midiValue);
          break;
      }
      
      setTimeout(() => {
        isUpdatingFromMidi.current = false;
      }, 0);
    }
    
    // Handle pitch bend
    if (event.type === 'pitchbend' && typeof event.value === 'number') {
      const wheelValue = (event.value + 1) / 2;
      setPitchBendValue(wheelValue);
      const pitchBendValue = Math.round((event.value + 1) * 8191);
      synth.pitchWheel(0, 0, pitchBendValue);
    }
  }, [showMessage, synth]);

  // Parameter change handler
  const handleParameterChange = useCallback((name: string, value: number, ccNumber?: number) => {
    showMessage({
      line1: ccNumber ? `CC ${ccNumber}: ${value}` : name,
      line2: name,
      type: 'PARAMETER'
    });
  }, [showMessage]);

  // BPM change handler
  const handleBpmChange = useCallback((bpm: number) => {
    showMessage({
      line1: 'TEMPO',
      line2: `${bpm} BPM`,
      type: 'TEMPORARY'
    });
  }, [showMessage]);

  // Update preset display
  useEffect(() => {
    showMessage({
      line1: selectedPreset?.presetName || 'No Preset',
      line2: selectedPreset ? `Bank ${selectedPreset.bank} • ${selectedPreset.program}` : '',
      type: 'PRESET'
    });
  }, [selectedPreset, showMessage]);

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  // Parameter handlers
  const handleFilterCutoffChange = useCallback((value: number) => {
    setFilterCutoff(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.FILTER_CUTOFF, value);
      handleParameterChange('CUTOFF', value, CC.FILTER_CUTOFF);
    }
  }, [synth, handleParameterChange]);

  const handleFilterResonanceChange = useCallback((value: number) => {
    setFilterResonance(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.FILTER_RESONANCE, value);
      handleParameterChange('RESONANCE', value, CC.FILTER_RESONANCE);
    }
  }, [synth, handleParameterChange]);

  const handleAttackChange = useCallback((value: number) => {
    setAttackTime(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.ATTACK_TIME, value);
      handleParameterChange('ATTACK', value, CC.ATTACK_TIME);
    }
  }, [synth, handleParameterChange]);

  const handleDecayChange = useCallback((value: number) => {
    setDecayTime(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.DECAY_TIME, value);
      handleParameterChange('DECAY', value, CC.DECAY_TIME);
    }
  }, [synth, handleParameterChange]);

  const handleSustainChange = useCallback((value: number) => {
    setSustainLevel(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.SUSTAIN_LEVEL, value);
      handleParameterChange('SUSTAIN', value, CC.SUSTAIN_LEVEL);
    }
  }, [synth, handleParameterChange]);

  const handleReleaseChange = useCallback((value: number) => {
    setReleaseTime(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.RELEASE_TIME, value);
      handleParameterChange('RELEASE', value, CC.RELEASE_TIME);
    }
  }, [synth, handleParameterChange]);

  // Note handling system
  const handleNoteOn = useCallback((midiNote: number, velocity: number = 127) => {
    // Always update the active notes set first
    activeNotesRef.current.add(midiNote);
    requestAnimationFrame(() => {
      setActiveNotes(new Set(activeNotesRef.current));
    });

    // Then handle arpeggiator or direct synth
    if (arpeggiator.isOn) {
      setHeldNotes(prev => {
        const newNotes = [...prev, { note: midiNote, velocity, timestamp: Date.now() }];
        return newNotes;
      });
      if (!arpIntervalRef.current) {
        startArpeggiator();
      }
    } else {
      synth.noteOn(0, midiNote, velocity);
    }
  }, [synth, arpeggiator.isOn, startArpeggiator]);

  const handleNoteOff = useCallback((midiNote: number) => {
    // Always update the active notes set first
    activeNotesRef.current.delete(midiNote);
    requestAnimationFrame(() => {
      setActiveNotes(new Set(activeNotesRef.current));
    });

    // Then handle arpeggiator or direct synth
    if (arpeggiator.isOn) {
      if (!arpeggiator.hold) {
        setHeldNotes(prev => prev.filter(n => n.note !== midiNote));
      }
    } else {
      synth.noteOff(0, midiNote);
    }
  }, [synth, arpeggiator.isOn, arpeggiator.hold]);

  // Mouse handlers
  const handleMouseDown = useCallback((midiNote: number) => {
    setIsMouseDown(true);
    handleNoteOn(midiNote, 100);
  }, [handleNoteOn]);

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false);
    // Create a copy of the current active notes to avoid modification during iteration
    const notesToRelease = Array.from(activeNotesRef.current);
    notesToRelease.forEach(note => handleNoteOff(note));
  }, [handleNoteOff]);

  const handleMouseEnter = useCallback((midiNote: number) => {
    if (isMouseDown) {
      handleNoteOn(midiNote, 100);
    }
  }, [isMouseDown, handleNoteOn]);

  const handleMouseLeave = useCallback((midiNote: number) => {
    handleNoteOff(midiNote);
  }, [handleNoteOff]);

  // MIDI input handlers
  const handleMidiInput = useCallback((e: any) => {
    if (e.type === 'noteon') {
      const note = e.note.number;
      const velocity = Math.round(e.velocity * 127);
      handleNoteOn(note, velocity);
    } else if (e.type === 'noteoff') {
      const note = e.note.number;
      handleNoteOff(note);
    }
    handleMidiMessage(e);
  }, [handleNoteOn, handleNoteOff, handleMidiMessage]);

  // Update MIDI input selection
  useEffect(() => {
    if (!selectedInput || !WebMidi.enabled) return;

    const input = WebMidi.getInputByName(selectedInput);
    if (!input) return;

    input.addListener('noteon', handleMidiInput);
    input.addListener('noteoff', handleMidiInput);
    input.addListener('controlchange', handleMidiMessage);
    input.addListener('pitchbend', handleMidiMessage);

    return () => {
      input.removeListener('noteon');
      input.removeListener('noteoff');
      input.removeListener('controlchange');
      input.removeListener('pitchbend');
    };
  }, [selectedInput, handleMidiInput, handleMidiMessage]);

  // Update global mouse handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isMouseDown) {
        setIsMouseDown(false);
        const notesToRelease = Array.from(activeNotesRef.current);
        notesToRelease.forEach(note => handleNoteOff(note));
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isMouseDown, handleNoteOff]);

  // Initialize MIDI
  useEffect(() => {
    const initializeMidi = async () => {
      try {
        if (!WebMidi.enabled) {
          await WebMidi.enable();
        }
        setMidiInputs(WebMidi.inputs);
        
        const handleDeviceConnection = () => {
          setMidiInputs(WebMidi.inputs);
        };
        
        WebMidi.addListener('connected', handleDeviceConnection);
        WebMidi.addListener('disconnected', handleDeviceConnection);

        return () => {
          WebMidi.removeListener('connected', handleDeviceConnection);
          WebMidi.removeListener('disconnected', handleDeviceConnection);
        };
      } catch (err) {
        console.warn('WebMidi could not be enabled:', err);
      }
    };

    initializeMidi();
    return () => {
      if (WebMidi.enabled) {
        WebMidi.disable();
      }
    };
  }, []);

  // Add volume handler
  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.VOLUME, value);
      handleParameterChange('VOLUME', value, CC.VOLUME);
    }
  }, [synth, handleParameterChange]);

  // Initialize reverb level to 0 when component mounts
  useEffect(() => {
    if (synth) {
      // Enable reverb by default during initialization
      synth.effectsConfig = {
        reverbEnabled: true,
        reverbImpulseResponse: undefined  // Use default impulse response
      };
    }
  }, [synth]);

  const handleArpeggiatorChange = useCallback((changes: Partial<ArpeggiatorState>) => {
    setArpeggiator(prev => {
      const newState = { ...prev, ...changes };
      return newState;
    });
  }, []);

  const renderKeys = () => {
    const keys: JSX.Element[] = [];
    
    // Render C1 through B4
    for (let octave = START_OCTAVE; octave < START_OCTAVE + NUM_OCTAVES; octave++) {
      NOTES.forEach(note => {
        const midiNote = getMidiNote(note, octave);
        const isSharp = note.includes('#');
        const isActive = activeNotes.has(midiNote);
        
        keys.push(
          <div
            key={`${note}${octave}`}
            className={`piano-key ${isSharp ? 'black' : 'white'} ${isActive ? 'active' : ''}`}
            onMouseDown={() => handleMouseDown(midiNote)}
            onMouseEnter={() => handleMouseEnter(midiNote)}
            onMouseLeave={() => handleMouseLeave(midiNote)}
          >
            <div className="key-label">{`${note}${octave}`}</div>
          </div>
        );
      });
    }

    // Add C5 at the end
    const c5MidiNote = getMidiNote('C', START_OCTAVE + NUM_OCTAVES);
    keys.push(
      <div
        key="C5"
        data-note="C5"
        className={`piano-key white ${activeNotes.has(c5MidiNote) ? 'active' : ''}`}
        onMouseDown={() => handleMouseDown(c5MidiNote)}
        onMouseEnter={() => handleMouseEnter(c5MidiNote)}
        onMouseLeave={() => handleMouseLeave(c5MidiNote)}
      >
        <div className="key-label">C5</div>
      </div>
    );

    return keys;
  };

  // LFO handlers
  const handleModWheelChange = useCallback((value: number) => {
    setModWheel(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.MOD_WHEEL, value);
      handleParameterChange('MOD WHEEL', value, CC.MOD_WHEEL);
    }
  }, [synth, handleParameterChange]);

  const handleTremoloChange = useCallback((value: number) => {
    setTremolo(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.TREMOLO, value);
      handleParameterChange('TREMOLO', value, CC.TREMOLO);
    }
  }, [synth, handleParameterChange]);

  // Effects handlers
  const handleReverbLevelChange = useCallback((value: number) => {
    setReverbLevel(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.REVERB_LEVEL, value);
      handleParameterChange('REVERB', value, CC.REVERB_LEVEL);
    }
  }, [synth, handleParameterChange]);

  const handleChorusLevelChange = useCallback((value: number) => {
    setChorusLevel(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.CHORUS_LEVEL, value);
      handleParameterChange('CHORUS', value, CC.CHORUS_LEVEL);
    }
  }, [synth, handleParameterChange]);

  // Modulation Envelope handlers
  const handleModEnvToFilterChange = useCallback((value: number) => {
    setModEnvToFilter(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.MOD_ENV_TO_FILTER, value);
      handleParameterChange('MOD→FILT', value, CC.MOD_ENV_TO_FILTER);
    }
  }, [synth, handleParameterChange]);

  const handleModEnvAttackChange = useCallback((value: number) => {
    setModEnvAttack(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.MOD_ENV_ATTACK, value);
      handleParameterChange('MOD ATK', value, CC.MOD_ENV_ATTACK);
    }
  }, [synth, handleParameterChange]);

  const handleModEnvDecayChange = useCallback((value: number) => {
    setModEnvDecay(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.MOD_ENV_DECAY, value);
      handleParameterChange('MOD DCY', value, CC.MOD_ENV_DECAY);
    }
  }, [synth, handleParameterChange]);

  const handleModEnvSustainChange = useCallback((value: number) => {
    setModEnvSustain(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.MOD_ENV_SUSTAIN, value);
      handleParameterChange('MOD SUS', value, CC.MOD_ENV_SUSTAIN);
    }
  }, [synth, handleParameterChange]);

  const handleModEnvReleaseChange = useCallback((value: number) => {
    setModEnvRelease(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.MOD_ENV_RELEASE, value);
      handleParameterChange('MOD REL', value, CC.MOD_ENV_RELEASE);
    }
  }, [synth, handleParameterChange]);

  // Wheel handlers
  const handlePitchBend = useCallback((value: number) => {
    requestAnimationFrame(() => {
      setPitchBendValue(value);
      const pitchBendValue = Math.round(value * 16383);
      synth.pitchWheel(0, 0, pitchBendValue);
    });
  }, [synth]);

  const handleModulation = useCallback((value: number) => {
    requestAnimationFrame(() => {
      setModulationValue(value);
      const modulationValue = Math.round(value * 127);
      synth.controllerChange(0, 1, modulationValue);
      handleParameterChange('MOD', modulationValue, CC.MOD_WHEEL);
    });
  }, [synth, handleParameterChange]);

  const getMidiNote = (note: string, octave: number) => {
    const noteIndex = NOTES.indexOf(note);
    return (octave * 12) + noteIndex + 24; // 24 is C1 in MIDI
  };

  // Add effect to handle arpeggiator state changes
  useEffect(() => {
    if (arpeggiator.isOn && heldNotes.length > 0) {
      startArpeggiator();
    } else {
      stopArpeggiator();
    }
  }, [arpeggiator.isOn, arpeggiator.rate, arpeggiator.direction, arpeggiator.octaveRange, heldNotes, startArpeggiator, stopArpeggiator]);

  // Clean up arpeggiator on unmount
  useEffect(() => {
    return () => {
      stopArpeggiator();
    };
  }, [stopArpeggiator]);

  return (
    <div className="piano-container">
      <div className="midi-controls">
        <div className="midi-input-section">
          <select
            className="midi-select"
            value={selectedInput}
            onChange={(e) => setSelectedInput(e.target.value)}
          >
            <option value="">Select MIDI Input</option>
            {midiInputs.map((input) => (
              <option key={input.id} value={input.name}>
                {input.name}
              </option>
            ))}
          </select>
          {selectedInput && (
            <span className="midi-status">
              Connected to: {selectedInput}
            </span>
          )}
        </div>
        <div className="effects-controls">
          <div className="knob-container">
            <Knob
              value={reverbLevel}
              onChange={handleReverbLevelChange}
              min={0}
              max={127}
              label="REVERB"
            />
          </div>
          <div className="knob-container">
            <Knob
              value={chorusLevel}
              onChange={handleChorusLevelChange}
              min={0}
              max={127}
              label="CHORUS"
            />
          </div>
          <ArpeggiatorControls
            state={arpeggiator}
            onChange={handleArpeggiatorChange}
            onBpmChange={handleBpmChange}
          />
          <div className="knob-container">
            <Knob
              value={volume}
              onChange={handleVolumeChange}
              min={0}
              max={127}
              label="VOLUME"
            />
          </div>
        </div>
        <div className="logo-section">
          <img src={islaLogo} alt="Isla" className="isla-logo" />
        </div>
      </div>

      <div className="modulation-panel">
        <div className="filter-section">
          <h4>Filter</h4>
          <div className="knob-row">
            <Knob
              value={filterCutoff}
              onChange={handleFilterCutoffChange}
              min={0}
              max={127}
              label="Cutoff"
            />
            <Knob
              value={filterResonance}
              onChange={handleFilterResonanceChange}
              min={0}
              max={127}
              label="Res"
            />
          </div>
        </div>

        <div className="envelope-section">
          <h4>Envelope</h4>
          <div className="knob-row">
            <Knob
              value={attackTime}
              onChange={handleAttackChange}
              min={0}
              max={127}
              label="A"
            />
            <Knob
              value={decayTime}
              onChange={handleDecayChange}
              min={0}
              max={127}
              label="D"
            />
            <Knob
              value={sustainLevel}
              onChange={handleSustainChange}
              min={0}
              max={127}
              label="S"
            />
            <Knob
              value={releaseTime}
              onChange={handleReleaseChange}
              min={0}
              max={127}
              label="R"
            />
          </div>
        </div>

        <div className="lfo-section">
          <h4>LFO</h4>
          <div className="knob-row">
            <Knob
              value={modWheel}
              onChange={handleModWheelChange}
              min={0}
              max={127}
              label="Vibrato"
            />
            <Knob
              value={tremolo}
              onChange={handleTremoloChange}
              min={0}
              max={127}
              label="Tremolo"
            />
          </div>
        </div>

        <div className="mod-env-section">
          <h4>Mod Env</h4>
          <div className="knob-row">
            <Knob
              label="A"
              value={modEnvAttack}
              onChange={handleModEnvAttackChange}
            />
            <Knob
              label="D"
              value={modEnvDecay}
              onChange={handleModEnvDecayChange}
            />
            <Knob
              label="S"
              value={modEnvSustain}
              onChange={handleModEnvSustainChange}
            />
            <Knob
              label="R"
              value={modEnvRelease}
              onChange={handleModEnvReleaseChange}
            />
            <Knob
              label="→ Filt"
              value={modEnvToFilter}
              onChange={handleModEnvToFilterChange}
            />
          </div>
        </div>

        <div className="preset-display">
          <LCD 
            line1={currentMessage.line1}
            line2={currentMessage.line2}
            width="100%"
            height="100%"
            backlit={true}
          />
        </div>
      </div>

      <div className="keyboard-section">
        <div className="wheels-container">
          <Slider
            value={pitchBendValue}
            onChange={handlePitchBend}
            label="PITCH"
            color="#ff4444"
            springLoaded={true}
          />
          <Slider
            value={modulationValue}
            onChange={handleModulation}
            label="MOD"
            color="#ff4444"
          />
        </div>
        <div className="keyboard-container">
          {renderKeys()}
        </div>
      </div>
    </div>
  );
};

export default PianoKeyboard; 