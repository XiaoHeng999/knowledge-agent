export type PaletteMode = 'search' | 'parameter';

export type ResultGroupType = 'recent' | 'commands' | 'navigation' | 'knowledge' | 'actions';

export interface PaletteResultItem {
  id: string;
  label: string;
  description?: string;
  group: ResultGroupType;
  icon?: string;
  action: () => void;
}

export interface ResultGroup {
  type: ResultGroupType;
  label: string;
  icon: string;
  items: PaletteResultItem[];
  total: number;
}

export interface FuzzyMatch {
  matchType: 'exact' | 'prefix' | 'word-boundary' | 'fuzzy';
  score: number;
  matchedIndices: number[];
}

export interface ParameterState {
  commandName: string;
  commandLabel: string;
  params: ParameterStep[];
  currentStep: number;
}

export interface ParameterStep {
  name: string;
  placeholder: string;
  hint?: string;
  required: boolean;
  validationPattern?: RegExp;
  validationMessage?: string;
  suggestions?: string[];
}
