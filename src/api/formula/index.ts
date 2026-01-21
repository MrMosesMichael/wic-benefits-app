/**
 * Formula API
 * A4.1 - Formula availability tracking API endpoints
 */

// Availability endpoints
export {
  updateFormulaAvailability,
  getFormulaAvailability,
  queryFormulaAvailability,
  checkFormulaAvailability,
  clearStaleAvailabilityData,
} from './availability';

// Sightings endpoints
export {
  recordFormulaSighting,
  getFormulaSightings,
  verifyFormulaSighting,
} from './sightings';

// Products endpoints
export {
  getFormulaProduct,
  getWICApprovedFormulas,
  getAlternativeFormulas,
  searchFormulas,
  getFormulasByBrand,
  upsertFormulaProduct,
  addAlternativeFormula,
  removeAlternativeFormula,
} from './products';
