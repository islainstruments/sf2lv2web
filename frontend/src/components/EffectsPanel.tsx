import React, { useEffect, useState, MouseEvent as ReactMouseEvent } from 'react';
import { Synthetizer, Preset } from '../types';
import '../styles/EffectsPanel.css';

interface EffectsPanelProps {
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

const Knob: React.FC<KnobProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  size = 30,
  color = '#ff4444',
  sensitivity = 0.5,
  label,
  step = 0.001
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const isDragging = React.useRef(false);
  const startY = React.useRef(0);
  const startValue = React.useRef(0);

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
      <div className="knob-value">{value.toFixed(2)}</div>
    </div>
  );
};

const EffectsPanel: React.FC<EffectsPanelProps> = ({ synth, selectedPreset }) => {
  const [filterCutoff, setFilterCutoff] = useState(20000);
  const [filterResonance, setFilterResonance] = useState(0.5);
  const [attackTime, setAttackTime] = useState(0.01);
  const [decayTime, setDecayTime] = useState(0.1);
  const [sustainLevel, setSustainLevel] = useState(0.7);
  const [releaseTime, setReleaseTime] = useState(0.1);

  const handleFilterCutoffChange = (value: number) => {
    setFilterCutoff(value);
    // Use controllerChange for filter cutoff (controller 74)
    synth.controllerChange(0, 74, Math.round((value / 20000) * 127));
  };

  const handleFilterResonanceChange = (value: number) => {
    setFilterResonance(value);
    // Use controllerChange for filter resonance (controller 71)
    synth.controllerChange(0, 71, Math.round((value / 20) * 127));
  };

  const handleAttackChange = (value: number) => {
    setAttackTime(value);
    // Use controllerChange for attack time (controller 73)
    synth.controllerChange(0, 73, Math.round((value / 2) * 127));
  };

  const handleDecayChange = (value: number) => {
    setDecayTime(value);
    // Use controllerChange for decay time (controller 75)
    synth.controllerChange(0, 75, Math.round((value / 2) * 127));
  };

  const handleSustainChange = (value: number) => {
    setSustainLevel(value);
    // Use controllerChange for sustain level (controller 70)
    synth.controllerChange(0, 70, Math.round(value * 127));
  };

  const handleReleaseChange = (value: number) => {
    setReleaseTime(value);
    // Use controllerChange for release time (controller 72)
    synth.controllerChange(0, 72, Math.round((value / 2) * 127));
  };

  return (
    <div className="effects-panel">
      <h3 className="effects-title">Effects</h3>
      <div className="modulators-grid">
        <div className="filter-section">
          <h4>Filter</h4>
          <div className="knob-row">
            <Knob
              label="Cutoff"
              value={filterCutoff}
              min={20}
              max={20000}
              step={1}
              onChange={handleFilterCutoffChange}
            />
            <Knob
              label="Resonance"
              value={filterResonance}
              min={0}
              max={20}
              step={0.1}
              onChange={handleFilterResonanceChange}
            />
          </div>
        </div>

        <div className="envelope-section">
          <h4>Envelope</h4>
          <div className="knob-row">
            <Knob
              label="Attack"
              value={attackTime}
              min={0.001}
              max={2}
              step={0.001}
              onChange={handleAttackChange}
            />
            <Knob
              label="Decay"
              value={decayTime}
              min={0.001}
              max={2}
              step={0.001}
              onChange={handleDecayChange}
            />
            <Knob
              label="Sustain"
              value={sustainLevel}
              min={0}
              max={1}
              step={0.01}
              onChange={handleSustainChange}
            />
            <Knob
              label="Release"
              value={releaseTime}
              min={0.001}
              max={2}
              step={0.001}
              onChange={handleReleaseChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EffectsPanel; 