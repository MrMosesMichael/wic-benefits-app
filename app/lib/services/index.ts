/**
 * Services Index
 *
 * Central export point for all services
 */

// Benefit Validation Service (R5.1)
export {
  BenefitValidationService,
  benefitValidationService,
  convertToBenefitBalance,
  convertMultipleBenefits,
  DEFAULT_THRESHOLDS,
} from './benefitValidation';

export type {
  BenefitBalance,
  DiscrepancyWarning,
  ValidationResult,
  ValidationThresholds,
} from './benefitValidation';

// Re-export API service
export { default as api } from './api';
