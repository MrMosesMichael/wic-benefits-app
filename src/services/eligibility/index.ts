/**
 * Eligibility Service Module
 *
 * Exports eligibility checking functionality:
 * - EligibilityRulesEngine: Core rule evaluation engine
 * - StateRulesConfig: State-specific policy configuration
 * - EligibilityService: High-level eligibility checking service
 *
 * @module services/eligibility
 */

export {
  EligibilityRulesEngine,
  EligibilityEvaluation,
  ProductEligibilityInput,
  ParticipantContext,
  HouseholdContext,
  RuleViolation,
  RuleType,
} from './EligibilityRulesEngine';

export {
  StateRulesConfig,
  StatePolicyConfig,
  StateSpecialRule,
} from './StateRulesConfig';

export {
  EligibilityService,
  EligibilityCheckRequest,
  EligibilityCheckResponse,
  BatchEligibilityCheckRequest,
} from './EligibilityService';
