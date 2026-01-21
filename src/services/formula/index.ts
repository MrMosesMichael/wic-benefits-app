/**
 * Formula Services
 * A4.1 - Formula availability tracking
 * A4.2 - Formula shortage detection
 */

export {
  FormulaAvailabilityService,
  getFormulaAvailabilityService,
} from './FormulaAvailabilityService';

export {
  FormulaProductService,
  getFormulaProductService,
} from './FormulaProductService';

export {
  FormulaShortageDetectionService,
  getFormulaShortageDetectionService,
  ShortageSeverity,
} from './FormulaShortageDetectionService';

export type {
  ShortageDetection,
  ShortageAnalysisOptions,
} from './FormulaShortageDetectionService';

export * from '../../types/formula';
