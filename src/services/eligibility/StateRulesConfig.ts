/**
 * State-Specific Eligibility Rules Configuration
 *
 * Defines state-specific eligibility rules, restrictions, and policies
 * for Michigan, North Carolina, Florida, and Oregon.
 *
 * @module services/eligibility/StateRulesConfig
 */

import { StateCode, AdditionalRestrictions } from '../../types/apl.types';

/**
 * State-specific policy configuration
 */
export interface StatePolicyConfig {
  /** State code */
  state: StateCode;

  /** State display name */
  displayName: string;

  /** eWIC processor used by state */
  processor: 'fis' | 'conduent' | 'state' | 'jpmc' | 'xerox';

  /** Default additional restrictions applied to all products */
  defaultRestrictions?: AdditionalRestrictions;

  /** Category-specific restrictions */
  categoryRestrictions: Map<string, AdditionalRestrictions>;

  /** Formula contract brand (if applicable) */
  formulaContractBrand?: {
    brand: string;
    startDate: Date;
    endDate?: Date;
  };

  /** State-specific eligibility notes */
  notes?: string[];

  /** Special rules or exceptions */
  specialRules?: StateSpecialRule[];
}

/**
 * Special state-specific rule
 */
export interface StateSpecialRule {
  /** Rule identifier */
  id: string;

  /** Rule name */
  name: string;

  /** Rule description */
  description: string;

  /** Categories this rule applies to */
  applicableCategories?: string[];

  /** UPCs this rule applies to (specific products) */
  applicableUPCs?: string[];

  /** Rule evaluation function */
  evaluate?: (product: any) => { passes: boolean; message?: string };
}

/**
 * State Rules Configuration Registry
 */
export class StateRulesConfig {
  private static configs: Map<StateCode, StatePolicyConfig> = new Map();

  /**
   * Initialize state configurations
   */
  static initialize(): void {
    this.configs.set('MI', this.getMichiganConfig());
    this.configs.set('NC', this.getNorthCarolinaConfig());
    this.configs.set('FL', this.getFloridaConfig());
    this.configs.set('OR', this.getOregonConfig());
  }

  /**
   * Get configuration for a state
   */
  static getConfig(state: StateCode): StatePolicyConfig | undefined {
    if (this.configs.size === 0) {
      this.initialize();
    }
    return this.configs.get(state);
  }

  /**
   * Check if state is supported
   */
  static isStateSupported(state: StateCode): boolean {
    return ['MI', 'NC', 'FL', 'OR'].includes(state);
  }

  /**
   * Michigan Configuration (FIS Processor)
   */
  private static getMichiganConfig(): StatePolicyConfig {
    const categoryRestrictions = new Map<string, AdditionalRestrictions>();

    // Cereal restrictions
    categoryRestrictions.set('cereal', {
      wholeGrainRequired: true,
      maxSugarGrams: 6,
      restrictionNotes: 'Must be whole grain with ≤6g sugar per serving',
    });

    // Bread restrictions
    categoryRestrictions.set('bread', {
      wholeGrainRequired: true,
      restrictionNotes: 'Must be whole grain',
    });

    // Juice restrictions
    categoryRestrictions.set('juice', {
      maxSugarGrams: 120, // Natural sugars, no added sugar
      restrictionNotes: '100% juice, no added sugar',
    });

    return {
      state: 'MI',
      displayName: 'Michigan',
      processor: 'fis',
      categoryRestrictions,
      formulaContractBrand: {
        brand: 'Similac',
        startDate: new Date('2023-10-01'),
        endDate: new Date('2026-09-30'),
      },
      notes: [
        'Michigan uses FIS (Custom Data Processing) as eWIC processor',
        'Formula contract brand: Similac (through Sept 2026)',
        'Whole grain required for cereal and bread',
      ],
      specialRules: [
        {
          id: 'mi-formula-contract',
          name: 'Infant Formula Contract Brand',
          description: 'Only Similac brand formula is WIC-approved (unless medical exemption)',
          applicableCategories: ['infant_formula'],
        },
      ],
    };
  }

  /**
   * North Carolina Configuration (Conduent Processor)
   */
  private static getNorthCarolinaConfig(): StatePolicyConfig {
    const categoryRestrictions = new Map<string, AdditionalRestrictions>();

    // Cereal restrictions
    categoryRestrictions.set('cereal', {
      wholeGrainRequired: true,
      maxSugarGrams: 6,
      restrictionNotes: 'Whole grain with ≤6g sugar per dry ounce',
    });

    // Bread restrictions
    categoryRestrictions.set('bread', {
      wholeGrainRequired: true,
    });

    // Milk restrictions (NC requires Vitamin D fortification)
    categoryRestrictions.set('milk', {
      fortificationRequired: ['Vitamin D'],
      restrictionNotes: 'Must be Vitamin D fortified',
    });

    return {
      state: 'NC',
      displayName: 'North Carolina',
      processor: 'conduent',
      categoryRestrictions,
      formulaContractBrand: {
        brand: 'Enfamil',
        startDate: new Date('2023-10-01'),
        endDate: new Date('2026-09-30'),
      },
      notes: [
        'North Carolina uses Conduent as eWIC processor',
        'Formula contract brand: Enfamil (through Sept 2026)',
        'Milk must be Vitamin D fortified',
      ],
      specialRules: [
        {
          id: 'nc-formula-contract',
          name: 'Infant Formula Contract Brand',
          description: 'Only Enfamil brand formula is WIC-approved (unless medical exemption)',
          applicableCategories: ['infant_formula'],
        },
      ],
    };
  }

  /**
   * Florida Configuration (FIS Processor)
   */
  private static getFloridaConfig(): StatePolicyConfig {
    const categoryRestrictions = new Map<string, AdditionalRestrictions>();

    // Cereal restrictions
    categoryRestrictions.set('cereal', {
      wholeGrainRequired: true,
      maxSugarGrams: 6,
      noArtificialDyes: true, // Florida prohibits artificial dyes
      restrictionNotes: 'Whole grain, ≤6g sugar, no artificial dyes',
    });

    // Bread restrictions
    categoryRestrictions.set('bread', {
      wholeGrainRequired: true,
      noArtificialDyes: true,
    });

    // Yogurt restrictions
    categoryRestrictions.set('yogurt', {
      maxSugarGrams: 30,
      noArtificialDyes: true,
      restrictionNotes: '≤30g sugar per container, no artificial dyes',
    });

    return {
      state: 'FL',
      displayName: 'Florida',
      processor: 'fis',
      categoryRestrictions,
      formulaContractBrand: {
        brand: 'Similac',
        startDate: new Date('2023-10-01'),
        endDate: new Date('2026-09-30'),
      },
      notes: [
        'Florida uses FIS (Custom Data Processing) as eWIC processor',
        'Formula contract brand: Similac (through Sept 2026)',
        'Artificial dyes prohibited in cereal, bread, and yogurt',
      ],
      specialRules: [
        {
          id: 'fl-artificial-dyes',
          name: 'No Artificial Dyes',
          description: 'Florida prohibits artificial food dyes in WIC products',
          applicableCategories: ['cereal', 'bread', 'yogurt'],
        },
        {
          id: 'fl-formula-contract',
          name: 'Infant Formula Contract Brand',
          description: 'Only Similac brand formula is WIC-approved (unless medical exemption)',
          applicableCategories: ['infant_formula'],
        },
      ],
    };
  }

  /**
   * Oregon Configuration (State-Specific System)
   */
  private static getOregonConfig(): StatePolicyConfig {
    const categoryRestrictions = new Map<string, AdditionalRestrictions>();

    // Cereal restrictions
    categoryRestrictions.set('cereal', {
      wholeGrainRequired: true,
      maxSugarGrams: 6,
      restrictionNotes: 'Whole grain with ≤6g sugar per serving',
    });

    // Bread restrictions
    categoryRestrictions.set('bread', {
      wholeGrainRequired: true,
    });

    // Organic preference (Oregon encourages organic options)
    categoryRestrictions.set('produce', {
      organicRequired: false, // Not required, but encouraged
      restrictionNotes: 'Organic options encouraged where available',
    });

    return {
      state: 'OR',
      displayName: 'Oregon',
      processor: 'state',
      categoryRestrictions,
      formulaContractBrand: {
        brand: 'Similac',
        startDate: new Date('2023-10-01'),
        endDate: new Date('2026-09-30'),
      },
      notes: [
        'Oregon uses state-specific eWIC system',
        'Formula contract brand: Similac (through Sept 2026)',
        'Emphasis on organic and local options',
      ],
      specialRules: [
        {
          id: 'or-formula-contract',
          name: 'Infant Formula Contract Brand',
          description: 'Only Similac brand formula is WIC-approved (unless medical exemption)',
          applicableCategories: ['infant_formula'],
        },
        {
          id: 'or-organic-preference',
          name: 'Organic Preference',
          description: 'Oregon encourages organic options when available',
          applicableCategories: ['produce', 'milk', 'eggs'],
        },
      ],
    };
  }

  /**
   * Get restriction for category in state
   */
  static getCategoryRestriction(
    state: StateCode,
    category: string
  ): AdditionalRestrictions | undefined {
    const config = this.getConfig(state);
    if (!config) return undefined;

    // Normalize category name
    const categoryLower = category.toLowerCase().trim();
    return config.categoryRestrictions.get(categoryLower);
  }

  /**
   * Get formula contract brand for state
   */
  static getFormulaContractBrand(state: StateCode): string | undefined {
    const config = this.getConfig(state);
    if (!config || !config.formulaContractBrand) return undefined;

    const now = new Date();
    const contract = config.formulaContractBrand;

    // Check if contract is currently active
    if (contract.startDate > now) return undefined;
    if (contract.endDate && contract.endDate < now) return undefined;

    return contract.brand;
  }

  /**
   * Check if state has specific rule
   */
  static hasSpecialRule(state: StateCode, ruleId: string): boolean {
    const config = this.getConfig(state);
    if (!config || !config.specialRules) return false;

    return config.specialRules.some(rule => rule.id === ruleId);
  }

  /**
   * Get all special rules for state
   */
  static getSpecialRules(state: StateCode): StateSpecialRule[] {
    const config = this.getConfig(state);
    return config?.specialRules || [];
  }

  /**
   * Get human-readable state policy summary
   */
  static getPolicySummary(state: StateCode): string {
    const config = this.getConfig(state);
    if (!config) {
      return `State ${state} is not currently supported.`;
    }

    const lines: string[] = [
      `${config.displayName} WIC Policy`,
      `Processor: ${config.processor.toUpperCase()}`,
    ];

    if (config.formulaContractBrand) {
      lines.push(`Formula Contract: ${config.formulaContractBrand.brand}`);
    }

    if (config.notes && config.notes.length > 0) {
      lines.push('');
      lines.push('Notes:');
      config.notes.forEach(note => lines.push(`  - ${note}`));
    }

    if (config.specialRules && config.specialRules.length > 0) {
      lines.push('');
      lines.push('Special Rules:');
      config.specialRules.forEach(rule => {
        lines.push(`  - ${rule.name}: ${rule.description}`);
      });
    }

    return lines.join('\n');
  }
}

// Initialize on module load
StateRulesConfig.initialize();
