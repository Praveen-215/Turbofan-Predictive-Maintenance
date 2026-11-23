/**
 * NASA C-MAPSS FD001 Turbofan Feature Domain Model
 * Strongly typed metadata for the 17 selected model features.
 *
 * Constraints:
 * 1. Exact canonical 17-feature order matching models/selected_features.json.
 * 2. Operating settings labeled as "Operating Condition 1" & "Operating Condition 2".
 * 3. Only verified NASA engineering units and symbols.
 * 4. Constant / removed features strictly excluded.
 */

export type SensorCategory =
  | 'Temperatures'
  | 'Pressures'
  | 'Rotor Speeds'
  | 'Flow & Bleed'
  | 'Operating Conditions';

export type SelectedFeatureName =
  | 'op_setting_1'
  | 'op_setting_2'
  | 'sensor_2'
  | 'sensor_3'
  | 'sensor_4'
  | 'sensor_6'
  | 'sensor_7'
  | 'sensor_8'
  | 'sensor_9'
  | 'sensor_11'
  | 'sensor_12'
  | 'sensor_13'
  | 'sensor_14'
  | 'sensor_15'
  | 'sensor_17'
  | 'sensor_20'
  | 'sensor_21';

export interface SensorMetadata {
  /** Exact canonical feature identifier */
  readonly name: SelectedFeatureName;
  /** Human-readable scientific label */
  readonly label: string;
  /** Subsystem category */
  readonly category: SensorCategory;
  /** Engineering symbol (if established in C-MAPSS literature) */
  readonly symbol?: string;
  /** Engineering measurement unit (if established in C-MAPSS documentation) */
  readonly unit?: string;
  /** Technical description of physical sensor channel */
  readonly description: string;
}

/**
 * Exact canonical 17-feature order locked to the trained Stacked LSTM model
 */
export const CANONICAL_FEATURE_ORDER: readonly SelectedFeatureName[] = [
  'op_setting_1',
  'op_setting_2',
  'sensor_2',
  'sensor_3',
  'sensor_4',
  'sensor_6',
  'sensor_7',
  'sensor_8',
  'sensor_9',
  'sensor_11',
  'sensor_12',
  'sensor_13',
  'sensor_14',
  'sensor_15',
  'sensor_17',
  'sensor_20',
  'sensor_21',
] as const;

/**
 * Comprehensive dictionary of all 17 selected sensor and setting features
 */
export const SENSOR_METADATA_MAP: Record<SelectedFeatureName, SensorMetadata> = {
  op_setting_1: {
    name: 'op_setting_1',
    label: 'Operating Condition 1',
    category: 'Operating Conditions',
    description: 'Primary flight envelope operational condition',
  },
  op_setting_2: {
    name: 'op_setting_2',
    label: 'Operating Condition 2',
    category: 'Operating Conditions',
    description: 'Secondary flight envelope operational condition',
  },
  sensor_2: {
    name: 'sensor_2',
    label: 'LPC Outlet Temperature',
    symbol: 'T24',
    unit: '°R',
    category: 'Temperatures',
    description: 'Total temperature at Low-Pressure Compressor outlet',
  },
  sensor_3: {
    name: 'sensor_3',
    label: 'HPC Outlet Temperature',
    symbol: 'T30',
    unit: '°R',
    category: 'Temperatures',
    description: 'Total temperature at High-Pressure Compressor outlet',
  },
  sensor_4: {
    name: 'sensor_4',
    label: 'LPT Outlet Temperature',
    symbol: 'T50',
    unit: '°R',
    category: 'Temperatures',
    description: 'Total temperature at Low-Pressure Turbine outlet',
  },
  sensor_6: {
    name: 'sensor_6',
    label: 'Bypass Duct Pressure',
    symbol: 'P15',
    unit: 'psia',
    category: 'Pressures',
    description: 'Total pressure in bypass duct',
  },
  sensor_7: {
    name: 'sensor_7',
    label: 'HPC Outlet Pressure',
    symbol: 'P30',
    unit: 'psia',
    category: 'Pressures',
    description: 'Total pressure at High-Pressure Compressor outlet',
  },
  sensor_8: {
    name: 'sensor_8',
    label: 'Physical Fan Speed',
    symbol: 'Nf',
    unit: 'rpm',
    category: 'Rotor Speeds',
    description: 'Physical rotational speed of fan rotor',
  },
  sensor_9: {
    name: 'sensor_9',
    label: 'Physical Core Speed',
    symbol: 'Nc',
    unit: 'rpm',
    category: 'Rotor Speeds',
    description: 'Physical rotational speed of core rotor',
  },
  sensor_11: {
    name: 'sensor_11',
    label: 'Static HPC Outlet Pressure',
    symbol: 'Ps30',
    unit: 'psia',
    category: 'Pressures',
    description: 'Static pressure at High-Pressure Compressor outlet',
  },
  sensor_12: {
    name: 'sensor_12',
    label: 'Fuel Flow Ratio',
    symbol: 'W31/Ps30',
    unit: 'pps/psia',
    category: 'Flow & Bleed',
    description: 'Ratio of fuel flow to static pressure at HPC outlet',
  },
  sensor_13: {
    name: 'sensor_13',
    label: 'Corrected Fan Speed',
    symbol: 'Nf,corr',
    unit: 'rpm',
    category: 'Rotor Speeds',
    description: 'Corrected rotational speed of fan rotor',
  },
  sensor_14: {
    name: 'sensor_14',
    label: 'Corrected Core Speed',
    symbol: 'Nc,corr',
    unit: 'rpm',
    category: 'Rotor Speeds',
    description: 'Corrected rotational speed of core rotor',
  },
  sensor_15: {
    name: 'sensor_15',
    label: 'Bypass Ratio',
    symbol: 'BPR',
    category: 'Flow & Bleed',
    description: 'Ratio of bypass air flow to core air flow',
  },
  sensor_17: {
    name: 'sensor_17',
    label: 'Bleed Enthalpy',
    symbol: 'htBleed',
    category: 'Flow & Bleed',
    description: 'Bleed air enthalpy during turbine cooling',
  },
  sensor_20: {
    name: 'sensor_20',
    label: 'HPT Coolant Bleed',
    symbol: 'W31',
    unit: 'lbm/s',
    category: 'Flow & Bleed',
    description: 'High-Pressure Turbine coolant bleed mass flow rate',
  },
  sensor_21: {
    name: 'sensor_21',
    label: 'LPT Coolant Bleed',
    symbol: 'W32',
    unit: 'lbm/s',
    category: 'Flow & Bleed',
    description: 'Low-Pressure Turbine coolant bleed mass flow rate',
  },
};

/**
 * Ordered list of subsystem categories for UI tabs and groupings
 */
export const SENSOR_CATEGORIES: readonly SensorCategory[] = [
  'Temperatures',
  'Pressures',
  'Rotor Speeds',
  'Flow & Bleed',
  'Operating Conditions',
] as const;

/**
 * Features grouped by subsystem category
 */
export const SENSORS_BY_CATEGORY: Record<SensorCategory, SensorMetadata[]> = {
  Temperatures: [
    SENSOR_METADATA_MAP.sensor_2,
    SENSOR_METADATA_MAP.sensor_3,
    SENSOR_METADATA_MAP.sensor_4,
  ],
  Pressures: [
    SENSOR_METADATA_MAP.sensor_6,
    SENSOR_METADATA_MAP.sensor_7,
    SENSOR_METADATA_MAP.sensor_11,
  ],
  'Rotor Speeds': [
    SENSOR_METADATA_MAP.sensor_8,
    SENSOR_METADATA_MAP.sensor_9,
    SENSOR_METADATA_MAP.sensor_13,
    SENSOR_METADATA_MAP.sensor_14,
  ],
  'Flow & Bleed': [
    SENSOR_METADATA_MAP.sensor_12,
    SENSOR_METADATA_MAP.sensor_15,
    SENSOR_METADATA_MAP.sensor_17,
    SENSOR_METADATA_MAP.sensor_20,
    SENSOR_METADATA_MAP.sensor_21,
  ],
  'Operating Conditions': [
    SENSOR_METADATA_MAP.op_setting_1,
    SENSOR_METADATA_MAP.op_setting_2,
  ],
};

/**
 * Helper to retrieve sensor metadata by feature name safely
 */
export function getSensorMetadata(featureName: string): SensorMetadata | undefined {
  if (featureName in SENSOR_METADATA_MAP) {
    return SENSOR_METADATA_MAP[featureName as SelectedFeatureName];
  }
  return undefined;
}
