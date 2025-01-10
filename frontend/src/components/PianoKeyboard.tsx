import React, { useEffect, useRef, useState } from 'react';
import { WebMidi, Input } from 'webmidi';
import { Synthetizer, Preset } from '../types';
import '../styles/PianoKeyboard.css';

interface PianoKeyboardProps {
  synth: Synthetizer;
  selectedPreset: Preset | null;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const START_OCTAVE = 1;
const NUM_OCTAVES = 4;

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({ synth, selectedPreset }) => {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [midiInputs, setMidiInputs] = useState<Input[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('');

  const handleNoteOn = (midiNote: number) => {
    console.log(`Note On - Note: ${midiNote}, Velocity: 127`);
    synth.noteOn(0, midiNote, 127); // Channel 0, max velocity
    setActiveNotes(prev => new Set(prev).add(midiNote));
  };

  const handleNoteOff = (midiNote: number) => {
    console.log(`Note Off - Note: ${midiNote}`);
    synth.noteOff(0, midiNote); // Channel 0
    setActiveNotes(prev => {
      const newSet = new Set(prev);
      newSet.delete(midiNote);
      return newSet;
    });
  };

  const getMidiNote = (note: string, octave: number) => {
    const noteIndex = NOTES.indexOf(note);
    return (octave * 12) + noteIndex + 24; // 24 is C1 in MIDI
  };

  // Mouse event handlers
  const handleMouseEnter = (midiNote: number) => {
    if (isMouseDown) {
      handleNoteOn(midiNote);
    }
  };

  const handleMouseLeave = (midiNote: number) => {
    if (activeNotes.has(midiNote)) {
      handleNoteOff(midiNote);
    }
  };

  const handleMouseDown = (midiNote: number) => {
    setIsMouseDown(true);
    handleNoteOn(midiNote);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    activeNotes.forEach(note => handleNoteOff(note));
  };

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

  // Handle MIDI input selection
  useEffect(() => {
    midiInputs.forEach(input => {
      if (input.removeListener) {
        input.removeListener();
      }
    });

    if (selectedInput && WebMidi.enabled) {
      const input = WebMidi.getInputByName(selectedInput);
      if (input) {
        // Note events
        input.addListener('noteon', e => handleNoteOn(e.note.number));
        input.addListener('noteoff', e => handleNoteOff(e.note.number));

        // Control Change events
        input.addListener('controlchange', e => {
          if (typeof e.value === 'number' && typeof e.controller.number === 'number') {
            // Convert 0-1 float to 0-127 integer
            const midiValue = Math.round(e.value * 127);
            console.log(`Control Change - Controller: ${e.controller.number}, Value: ${midiValue}`);
            synth.controllerChange(0, e.controller.number, midiValue);
          }
        });

        // Pitch Bend events
        input.addListener('pitchbend', e => {
          if (typeof e.value === 'number') {
            // Convert from -1 to 1 range to 0-16383 range
            const pitchBendValue = Math.round((e.value + 1) * 8191);
            console.log(`Pitch Bend - Value: ${pitchBendValue}`);
            // Channel 0, LSB 0, MSB is our calculated value
            synth.pitchWheel(0, 0, pitchBendValue);
          }
        });

        // Program Change events
        input.addListener('programchange', e => {
          if (typeof e.value === 'number') {
            console.log(`Program Change - Program: ${e.value}`);
            synth.programChange(0, e.value);
          }
        });

        return () => {
          input.removeListener('noteon');
          input.removeListener('noteoff');
          input.removeListener('controlchange');
          input.removeListener('pitchbend');
          input.removeListener('programchange');
        };
      }
    }
  }, [selectedInput]);

  const renderKeys = () => {
    const keys: JSX.Element[] = [];
    
    // First render C2 through B5
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

    // Add C6 at the end
    const c6MidiNote = getMidiNote('C', START_OCTAVE + NUM_OCTAVES);
    keys.push(
      <div
        key="C6"
        data-note="C6"
        className={`piano-key white ${activeNotes.has(c6MidiNote) ? 'active' : ''}`}
        onMouseDown={() => handleMouseDown(c6MidiNote)}
        onMouseEnter={() => handleMouseEnter(c6MidiNote)}
        onMouseLeave={() => handleMouseLeave(c6MidiNote)}
      >
        <div className="key-label">C6</div>
      </div>
    );

    return keys;
  };

  return (
    <div className="piano-container">
      <div className="midi-controls">
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
      
      <div className="keyboard-container">
        {renderKeys()}
      </div>
    </div>
  );
};

export default PianoKeyboard; 