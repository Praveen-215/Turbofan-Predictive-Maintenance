import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  Thermometer,
  Gauge,
  RotateCw,
  Wind,
  Sliders,
  Check,
  X,
  Layers,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import {
  SensorCategory,
  SelectedFeatureName,
  SENSOR_CATEGORIES,
  SENSORS_BY_CATEGORY,
  SENSOR_METADATA_MAP,
} from '../../types/sensors';

export interface SubsystemFeatureTabsProps {
  /** Currently selected feature identifiers */
  selectedFeatures: SelectedFeatureName[];
  /** Callback when an individual feature toggle is triggered */
  onToggleFeature: (feature: SelectedFeatureName) => void;
  /** Optional callback for bulk feature selection */
  onSelectFeatures?: (features: SelectedFeatureName[]) => void;
  /** Optional controlled active category tab */
  activeCategory?: SensorCategory;
  /** Optional callback when active category tab changes */
  onCategoryChange?: (category: SensorCategory) => void;
  /** Additional container styling classes */
  className?: string;
}

const CATEGORY_ICONS: Record<SensorCategory, React.ComponentType<{ className?: string }>> = {
  Temperatures: Thermometer,
  Pressures: Gauge,
  'Rotor Speeds': RotateCw,
  'Flow & Bleed': Wind,
  'Operating Conditions': Sliders,
};

const DEFAULT_RECOMMENDED_FEATURES: SelectedFeatureName[] = ['sensor_2', 'sensor_3', 'sensor_4'];

export const SubsystemFeatureTabs: React.FC<SubsystemFeatureTabsProps> = memo(({
  selectedFeatures,
  onToggleFeature,
  onSelectFeatures,
  activeCategory,
  onCategoryChange,
  className = '',
}) => {
  // Support both controlled and uncontrolled active tab state
  const [internalCategory, setInternalCategory] = useState<SensorCategory>('Temperatures');
  const currentCategory = activeCategory ?? internalCategory;

  const handleCategorySelect = useCallback(
    (category: SensorCategory) => {
      if (onCategoryChange) {
        onCategoryChange(category);
      } else {
        setInternalCategory(category);
      }
    },
    [onCategoryChange]
  );

  // Compute selected count per subsystem category
  const categoryCounts = useMemo(() => {
    const counts: Record<SensorCategory, { selected: number; total: number }> = {
      Temperatures: { selected: 0, total: SENSORS_BY_CATEGORY.Temperatures.length },
      Pressures: { selected: 0, total: SENSORS_BY_CATEGORY.Pressures.length },
      'Rotor Speeds': { selected: 0, total: SENSORS_BY_CATEGORY['Rotor Speeds'].length },
      'Flow & Bleed': { selected: 0, total: SENSORS_BY_CATEGORY['Flow & Bleed'].length },
      'Operating Conditions': { selected: 0, total: SENSORS_BY_CATEGORY['Operating Conditions'].length },
    };

    selectedFeatures.forEach((featName) => {
      const meta = SENSOR_METADATA_MAP[featName];
      if (meta && counts[meta.category]) {
        counts[meta.category].selected += 1;
      }
    });

    return counts;
  }, [selectedFeatures]);

  // Features in currently active category
  const activeFeatures = useMemo(
    () => SENSORS_BY_CATEGORY[currentCategory] || [],
    [currentCategory]
  );

  // Check if all features in current category are selected
  const allCurrentSelected = useMemo(() => {
    return (
      activeFeatures.length > 0 &&
      activeFeatures.every((f) => selectedFeatures.includes(f.name))
    );
  }, [activeFeatures, selectedFeatures]);

  // Bulk select all features in active category
  const handleSelectAllCurrent = useCallback(() => {
    const activeNames = activeFeatures.map((f) => f.name);
    if (onSelectFeatures) {
      const merged = Array.from(new Set([...selectedFeatures, ...activeNames]));
      onSelectFeatures(merged);
    } else {
      activeNames.forEach((name) => {
        if (!selectedFeatures.includes(name)) {
          onToggleFeature(name);
        }
      });
    }
  }, [activeFeatures, onSelectFeatures, onToggleFeature, selectedFeatures]);

  // Bulk deselect all features in active category
  const handleDeselectAllCurrent = useCallback(() => {
    const activeSet = new Set(activeFeatures.map((f) => f.name));
    if (onSelectFeatures) {
      const remaining = selectedFeatures.filter((f) => !activeSet.has(f));
      onSelectFeatures(remaining);
    } else {
      activeFeatures.forEach((f) => {
        if (selectedFeatures.includes(f.name)) {
          onToggleFeature(f.name);
        }
      });
    }
  }, [activeFeatures, onSelectFeatures, onToggleFeature, selectedFeatures]);

  // Reset to default 3 temperature channels
  const handleResetToDefaults = useCallback(() => {
    if (onSelectFeatures) {
      onSelectFeatures(DEFAULT_RECOMMENDED_FEATURES);
    } else {
      selectedFeatures.forEach((f) => {
        if (!DEFAULT_RECOMMENDED_FEATURES.includes(f)) {
          onToggleFeature(f);
        }
      });
      DEFAULT_RECOMMENDED_FEATURES.forEach((f) => {
        if (!selectedFeatures.includes(f)) {
          onToggleFeature(f);
        }
      });
    }
  }, [onSelectFeatures, onToggleFeature, selectedFeatures]);

  return (
    <Card className={`p-4 flex flex-col gap-4 ${className}`}>
      {/* Header with Title and Selected Count */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white font-mono">
            Subsystem Feature Selection
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            ({selectedFeatures.length} of 17 selected)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetToDefaults}
            className="text-xs text-slate-400 hover:text-slate-200"
            icon={<RotateCcw className="w-3 h-3" />}
          >
            Reset Defaults
          </Button>
        </div>
      </div>

      {/* Subsystem Category Tabs */}
      <div
        role="tablist"
        aria-label="Sensor subsystem categories"
        className="flex flex-wrap items-center gap-1.5 p-1 bg-navy-950 rounded-lg border border-border-subtle"
      >
        {SENSOR_CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category];
          const isSelectedTab = currentCategory === category;
          const { selected, total } = categoryCounts[category];
          const hasSelectedInCat = selected > 0;

          return (
            <button
              key={category}
              type="button"
              role="tab"
              id={`tab-${category.toLowerCase().replace(/\s+/g, '-')}`}
              aria-selected={isSelectedTab}
              aria-controls={`panel-${category.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => handleCategorySelect(category)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                isSelectedTab
                  ? 'bg-slate-800 text-white font-semibold shadow-sm border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isSelectedTab
                    ? 'text-cyan-400'
                    : hasSelectedInCat
                    ? 'text-cyan-400/80'
                    : 'text-slate-500'
                }`}
              />
              <span>{category}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  hasSelectedInCat
                    ? isSelectedTab
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold'
                      : 'bg-navy-900 text-cyan-400 border border-cyan-800/40'
                    : 'bg-slate-900 text-slate-500'
                }`}
              >
                {selected}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category Actions Toolbar */}
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs text-slate-300 font-mono font-medium">
          {currentCategory} Channels ({activeFeatures.length}):
        </span>
        <div className="flex items-center gap-2">
          {allCurrentSelected ? (
            <button
              type="button"
              onClick={handleDeselectAllCurrent}
              className="text-[11px] text-slate-400 hover:text-slate-200 font-mono underline underline-offset-2 transition-colors"
            >
              Deselect All in {currentCategory}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSelectAllCurrent}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono underline underline-offset-2 transition-colors"
            >
              Select All in {currentCategory}
            </button>
          )}
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div
        role="tabpanel"
        id={`panel-${currentCategory.toLowerCase().replace(/\s+/g, '-')}`}
        aria-labelledby={`tab-${currentCategory.toLowerCase().replace(/\s+/g, '-')}`}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5"
      >
        {activeFeatures.map((feature) => {
          const isSelected = selectedFeatures.includes(feature.name);

          return (
            <button
              key={feature.name}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`${feature.label}${feature.symbol ? ` (${feature.symbol})` : ''}, ${
                isSelected ? 'selected' : 'not selected'
              }`}
              onClick={() => onToggleFeature(feature.name)}
              className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 group focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                isSelected
                  ? 'bg-cyan-950/30 border-cyan-500/60 shadow-sm shadow-cyan-950/40'
                  : 'bg-navy-950/50 border-border-subtle hover:border-slate-700 hover:bg-navy-950/80'
              }`}
            >
              {/* Checkbox Icon */}
              <div
                className={`mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center transition-colors border ${
                  isSelected
                    ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                    : 'bg-slate-900 border-slate-700 text-transparent group-hover:border-slate-600'
                }`}
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </div>

              {/* Feature Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`text-xs font-semibold truncate ${
                      isSelected ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {feature.label}
                  </span>
                  {feature.symbol && (
                    <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800/60 shrink-0">
                      {feature.symbol}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span className="text-slate-500">{feature.name}</span>
                  {feature.unit && (
                    <span className="text-slate-300 bg-slate-900 px-1 rounded text-[10px]">
                      {feature.unit}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Channels Summary Tray */}
      <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-border-subtle text-xs">
        <span className="text-[11px] font-mono text-slate-400 mr-1 shrink-0">
          Selected ({selectedFeatures.length}/17):
        </span>

        {selectedFeatures.length === 0 ? (
          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] py-0.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>No sensor channels selected. Select at least one channel to render telemetry.</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 items-center">
            {selectedFeatures.map((featName) => {
              const meta = SENSOR_METADATA_MAP[featName];
              if (!meta) return null;
              return (
                <span
                  key={featName}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-navy-950 border border-cyan-800/60 text-cyan-300"
                >
                  <span className="font-semibold">{meta.symbol ?? meta.name}</span>
                  {meta.unit && <span className="text-slate-400 text-[10px]">[{meta.unit}]</span>}
                  <button
                    type="button"
                    onClick={() => onToggleFeature(featName)}
                    className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800"
                    aria-label={`Deselect ${meta.label}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
});

SubsystemFeatureTabs.displayName = 'SubsystemFeatureTabs';
