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

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const START_OCTAVE = 1;
const NUM_OCTAVES = 4;

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

const lcdAlignCenter = (text: string, size = 16) => {
  return text.substr(0, size);
};

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

const LCD: React.FC<LCDProps> = ({ 
  line1, 
  line2, 
  width = "100%", 
  height = "auto", 
  backlit = true,
  midiMessage = null
}) => {
  const [displayLines, setDisplayLines] = useState({ line1, line2 });
  const [isShowingMidi, setIsShowingMidi] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!midiMessage) {
      setDisplayLines({ line1, line2 });
      return;
    }

    // Show MIDI message
    setIsShowingMidi(true);
    const formattedMessage = formatMidiMessage(midiMessage.event);  // Pass the raw event
    setDisplayLines(formattedMessage);

    // Clear existing timeout if there is one
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to revert to preset display
    timeoutRef.current = setTimeout(() => {
      setIsShowingMidi(false);
      setDisplayLines({ line1, line2 });
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [midiMessage, line1, line2]);

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
      >{lcdAlignCenter(displayLines.line1)}</text>
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
      >{lcdAlignCenter(displayLines.line2)}</text>
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

  // Memoize handlers to prevent unnecessary re-renders
  const handleFilterCutoffChange = useCallback((value: number) => {
    setFilterCutoff(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.FILTER_CUTOFF, value);
    }
  }, [synth]);

  const handleFilterResonanceChange = useCallback((value: number) => {
    setFilterResonance(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.FILTER_RESONANCE, value);
    }
  }, [synth]);

  const handleAttackChange = useCallback((value: number) => {
    setAttackTime(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.ATTACK_TIME, value);
    }
  }, [synth]);

  const handleDecayChange = useCallback((value: number) => {
    setDecayTime(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.DECAY_TIME, value);
    }
  }, [synth]);

  const handleSustainChange = useCallback((value: number) => {
    setSustainLevel(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.SUSTAIN_LEVEL, value);
    }
  }, [synth]);

  const handleReleaseChange = useCallback((value: number) => {
    setReleaseTime(value);
    if (!isUpdatingFromMidi.current) {
      synth.controllerChange(0, CC.RELEASE_TIME, value);
    }
  }, [synth]);

  // LFO handlers
  const handleModWheelChange = (value: number) => {
    setModWheel(value);
    synth.controllerChange(0, CC.MOD_WHEEL, value);
  };

  const handleTremoloChange = (value: number) => {
    setTremolo(value);
    synth.controllerChange(0, CC.TREMOLO, value);
  };

  // Modulation Envelope handlers
  const handleModEnvToFilterChange = (value: number) => {
    setModEnvToFilter(value);
    synth.controllerChange(0, CC.MOD_ENV_TO_FILTER, value);
  };

  const handleModEnvDelayChange = (value: number) => {
    setModEnvDelay(value);
    synth.controllerChange(0, CC.MOD_ENV_DELAY, value);
  };

  const handleModEnvAttackChange = (value: number) => {
    setModEnvAttack(value);
    synth.controllerChange(0, CC.MOD_ENV_ATTACK, value);
  };

  const handleModEnvHoldChange = (value: number) => {
    setModEnvHold(value);
    synth.controllerChange(0, CC.MOD_ENV_HOLD, value);
  };

  const handleModEnvDecayChange = (value: number) => {
    setModEnvDecay(value);
    synth.controllerChange(0, CC.MOD_ENV_DECAY, value);
  };

  const handleModEnvSustainChange = (value: number) => {
    setModEnvSustain(value);
    synth.controllerChange(0, CC.MOD_ENV_SUSTAIN, value);
  };

  const handleModEnvReleaseChange = (value: number) => {
    setModEnvRelease(value);
    synth.controllerChange(0, CC.MOD_ENV_RELEASE, value);
  };

  // Effects handlers
  const handleReverbLevelChange = (value: number) => {
    setReverbLevel(value);
    synth.controllerChange(0, CC.REVERB_LEVEL, value);
  };

  const handleChorusLevelChange = (value: number) => {
    setChorusLevel(value);
    synth.controllerChange(0, CC.CHORUS_LEVEL, value);
  };

  // Batch wheel updates
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
    });
  }, [synth]);

  // When preset changes, only set filter defaults
  useEffect(() => {
    if (synth) {
      synth.controllerChange(0, CC.FILTER_CUTOFF, 127);
      synth.controllerChange(0, CC.FILTER_RESONANCE, 0);
    }
  }, [selectedPreset, synth]);

  const handleNoteOn = useCallback((midiNote: number) => {
    synth.noteOn(0, midiNote, 127); // Channel 0, max velocity
    activeNotesRef.current.add(midiNote);
    requestAnimationFrame(() => {
      setActiveNotes(new Set(activeNotesRef.current));
    });
  }, [synth]);

  const handleNoteOff = useCallback((midiNote: number) => {
    synth.noteOff(0, midiNote); // Channel 0
    activeNotesRef.current.delete(midiNote);
    requestAnimationFrame(() => {
      setActiveNotes(new Set(activeNotesRef.current));
    });
  }, [synth]);

  const getMidiNote = (note: string, octave: number) => {
    const noteIndex = NOTES.indexOf(note);
    return (octave * 12) + noteIndex + 24; // 24 is C1 in MIDI
  };

  // Optimize mouse event handlers
  const handleMouseDown = useCallback((midiNote: number) => {
    setIsMouseDown(true);
    handleNoteOn(midiNote);
  }, [handleNoteOn]);

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false);
    activeNotesRef.current.forEach(note => handleNoteOff(note));
  }, [handleNoteOff]);

  const handleMouseEnter = useCallback((midiNote: number) => {
    if (isMouseDown) {
      handleNoteOn(midiNote);
    }
  }, [isMouseDown, handleNoteOn]);

  const handleMouseLeave = useCallback((midiNote: number) => {
    if (activeNotesRef.current.has(midiNote)) {
      handleNoteOff(midiNote);
    }
  }, [handleNoteOff]);

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsMouseDown(false);
      activeNotes.forEach(note => handleNoteOff(note));
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [activeNotes]);

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

  // Optimize MIDI input handling with batched updates
  const handleMidiNoteOn = useCallback((e: any) => {
    const note = e.note.number;
    const velocity = Math.round(e.velocity * 127); // Convert normalized velocity to MIDI range
    activeNotesRef.current.add(note);
    setActiveNotes(new Set(activeNotesRef.current));
    synth.noteOn(0, note, velocity);
  }, [synth]);

  const handleMidiNoteOff = useCallback((e: any) => {
    const note = e.note.number;
    activeNotesRef.current.delete(note);
    setActiveNotes(new Set(activeNotesRef.current));
    synth.noteOff(0, note);
  }, [synth]);

  // Optimize MIDI input selection
  useEffect(() => {
    if (!selectedInput || !WebMidi.enabled) return;

    const input = WebMidi.getInputByName(selectedInput);
    if (!input) return;

    input.addListener('noteon', handleMidiNoteOn);
    input.addListener('noteoff', handleMidiNoteOff);

    // Control Change events
    input.addListener('controlchange', e => {
      if (typeof e.value === 'number' && typeof e.controller.number === 'number') {
        // Set the flag before updating values
        isUpdatingFromMidi.current = true;
        
        // Update UI values based on CC number
        switch (e.controller.number) {
          case CC.MOD_WHEEL:
            console.log('Mod Wheel Values:', {
              rawInputValue: e.value,
              wheelValue: e.value  // Remove the inversion
            });
            // e.value is already normalized 0-1, use it directly
            setModulationValue(e.value);
            // Still send full MIDI value to synth
            synth.controllerChange(0, CC.MOD_WHEEL, Math.round(e.value * 127));
            break;
          case CC.FILTER_CUTOFF:
            setFilterCutoff(Math.round(e.value * 127));
            break;
          case CC.FILTER_RESONANCE:
            setFilterResonance(Math.round(e.value * 127));
            break;
          case CC.ATTACK_TIME:
            setAttackTime(Math.round(e.value * 127));
            break;
          case CC.DECAY_TIME:
            setDecayTime(Math.round(e.value * 127));
            break;
          case CC.SUSTAIN_LEVEL:
            setSustainLevel(Math.round(e.value * 127));
            break;
          case CC.RELEASE_TIME:
            setReleaseTime(Math.round(e.value * 127));
            break;
        }
        
        // Clear the flag after a short delay to ensure state updates are complete
        setTimeout(() => {
          isUpdatingFromMidi.current = false;
        }, 0);
      }
    });

    // Pitch Bend events
    input.addListener('pitchbend', e => {
      if (typeof e.value === 'number') {
        // e.value comes in as -1 to +1
        // Convert to 0-1 range matching physical direction:
        // -1 (down) = 0 (bottom of wheel)
        // 0 (center) = 0.5 (middle of wheel)
        // +1 (up) = 1 (top of wheel)
        const wheelValue = (e.value + 1) / 2;
        setPitchBendValue(wheelValue);
        
        console.log('Pitch Bend Values:', {
          rawInputValue: e.value,
          wheelValue: wheelValue
        });
        
        // Still send full pitch bend value to synth
        const pitchBendValue = Math.round((e.value + 1) * 8191);
        synth.pitchWheel(0, 0, pitchBendValue);
      }
    });

    return () => {
      input.removeListener('noteon');
      input.removeListener('noteoff');
      input.removeListener('controlchange');
      input.removeListener('pitchbend');
    };
  }, [selectedInput, handleMidiNoteOn, handleMidiNoteOff, synth]);

  // Add volume handler
  const handleVolumeChange = (value: number) => {
    setVolume(value);
    synth.controllerChange(0, CC.VOLUME, value);
  };

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

  const [currentMidiMessage, setCurrentMidiMessage] = useState<MidiMessage | null>(null);

  // Update MIDI listeners to use the message display
  useEffect(() => {
    if (!selectedInput || !WebMidi.enabled) return;

    const input = WebMidi.getInputByName(selectedInput);
    if (!input) return;

    const handleMidiEvent = (event: any) => {
      setCurrentMidiMessage({
        event,
        timestamp: Date.now()
      });
    };

    input.addListener('noteon', handleMidiEvent);
    input.addListener('noteoff', handleMidiEvent);
    input.addListener('controlchange', handleMidiEvent);
    input.addListener('pitchbend', handleMidiEvent);

    return () => {
      input.removeListener('noteon');
      input.removeListener('noteoff');
      input.removeListener('controlchange');
      input.removeListener('pitchbend');
    };
  }, [selectedInput]);

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
          <img src={islaLogo} alt="Isla Instruments" className="isla-logo" />
        </div>
      </div>

      <div className="modulation-panel">
        <div className="filter-section">
          <h4>Filter</h4>
          <div className="knob-row">
            <Knob
              label="Cutoff"
              value={filterCutoff}
              onChange={handleFilterCutoffChange}
            />
            <Knob
              label="Resonance"
              value={filterResonance}
              onChange={handleFilterResonanceChange}
            />
          </div>
        </div>

        <div className="envelope-section">
          <h4>Envelope</h4>
          <div className="knob-row">
            <Knob
              label="A"
              value={attackTime}
              onChange={handleAttackChange}
            />
            <Knob
              label="D"
              value={decayTime}
              onChange={handleDecayChange}
            />
            <Knob
              label="S"
              value={sustainLevel}
              onChange={handleSustainChange}
            />
            <Knob
              label="R"
              value={releaseTime}
              onChange={handleReleaseChange}
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
            line1={selectedPreset?.presetName || 'No Preset'} 
            line2={selectedPreset ? `Bank ${selectedPreset.bank} • ${selectedPreset.program}` : ''} 
            width="100%"
            height="100%"
            backlit={true}
            midiMessage={currentMidiMessage}
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