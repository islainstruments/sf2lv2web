import React from 'react';
import { SoundFont2, Preset } from '../lib/sfumato';
import '../styles/PresetList.css';
import { FixedSizeList } from 'react-window';

interface PresetListProps {
  soundFont: SoundFont2 | null;
  selectedPreset: Preset | null;
  onPresetSelect: (preset: Preset) => void;
}

const PresetList: React.FC<PresetListProps> = ({ soundFont, selectedPreset, onPresetSelect }) => {
  if (!soundFont) return null;

  // Filter out EOP marker and sort presets
  const filteredPresets = soundFont.presets
    .filter((preset: Preset) => preset.header.name !== 'EOP')
    .sort((a: Preset, b: Preset) => (
      a.header.bank * 1000 + a.header.preset - (b.header.bank * 1000 + b.header.preset)
    ));

  // Split presets into three roughly equal columns
  const splitIntoColumns = (presets: typeof filteredPresets) => {
    const columnSize = Math.ceil(presets.length / 3);
    return [
      presets.slice(0, columnSize),
      presets.slice(columnSize, columnSize * 2),
      presets.slice(columnSize * 2)
    ];
  };

  // Memoize the preset columns calculation
  const presetColumns = useMemo(() => {
    const filteredPresets = soundFont.presets
      .filter(preset => preset.header.name !== 'EOP')
      .sort((a, b) => (a.header.bank * 1000 + a.header.preset) - (b.header.bank * 1000 + b.header.preset));
      
    return splitIntoColumns(filteredPresets);
  }, [soundFont.presets]);

  // Create a memoized PresetRow component
  const PresetRow = memo(({ preset, isSelected, onClick }: PresetRowProps) => {
    return (
      <div
        className={`preset-row ${isSelected ? 'selected' : ''}`}
        onClick={onClick}
      >
        <div className="col">{`${preset.header.bank}:${preset.header.preset}`}</div>
        <div className="col name-col">{preset.header.name}</div>
      </div>
    );
  });

  const PresetVirtualList = ({ items, height, itemHeight }) => {
    return (
      <FixedSizeList
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        width="100%"
      >
        {({ index, style }) => (
          <PresetRow
            preset={items[index]}
            style={style}
            // ... other props
          />
        )}
      </FixedSizeList>
    );
  };

  return (
    <div className="presets-section">
      <h3>Presets</h3>
      <div className="presets-grid">
        {presetColumns.map((column, columnIndex) => (
          <div key={columnIndex} className="preset-column">
            <div className="presets-header">
              <div className="col">Bank</div>
              <div className="col">Preset</div>
              <div className="col">Name</div>
            </div>
            <div className="presets-list">
              {column.map((preset) => (
                <div
                  key={`${preset.header.bank}-${preset.header.preset}`}
                  className={`preset-row ${
                    selectedPreset?.header.bank === preset.header.bank && 
                    selectedPreset?.header.preset === preset.header.preset ? 'selected' : ''
                  }`}
                  onClick={() => onPresetSelect(preset)}
                >
                  <div className="col">{preset.header.bank}</div>
                  <div className="col">{preset.header.preset}</div>
                  <div className="col name-col">{preset.header.name}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PresetList; 