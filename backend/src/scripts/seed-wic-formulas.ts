/**
 * Seed WIC-approved infant formulas
 * Includes major brands and common products for priority states (MI, NC, FL, OR)
 */
import pool from '../config/database';

interface FormulaData {
  upc: string;
  brand: string;
  productName: string;
  formulaType: string;
  form: string;
  size: string;
  sizeOz: number;
  stateContractBrand: boolean;
  statesApproved: string[];
  manufacturer: string;
}

const formulas: FormulaData[] = [
  // ==================== SIMILAC (Abbott) ====================
  // Standard
  {
    upc: '0070074640709',
    brand: 'Similac',
    productName: 'Pro-Advance',
    formulaType: 'standard',
    form: 'powder',
    size: '30.8 oz',
    sizeOz: 30.8,
    stateContractBrand: true,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Abbott'
  },
  {
    upc: '0070074640716',
    brand: 'Similac',
    productName: 'Pro-Advance',
    formulaType: 'standard',
    form: 'ready_to_feed',
    size: '32 fl oz',
    sizeOz: 32,
    stateContractBrand: true,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Abbott'
  },
  {
    upc: '0070074640723',
    brand: 'Similac',
    productName: 'Pro-Advance',
    formulaType: 'standard',
    form: 'concentrate',
    size: '13 fl oz',
    sizeOz: 13,
    stateContractBrand: true,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Abbott'
  },
  {
    upc: '0070074679631',
    brand: 'Similac',
    productName: 'Advance',
    formulaType: 'standard',
    form: 'powder',
    size: '12.4 oz',
    sizeOz: 12.4,
    stateContractBrand: true,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Abbott'
  },

  // Sensitive
  {
    upc: '0070074651774',
    brand: 'Similac',
    productName: 'Pro-Sensitive',
    formulaType: 'sensitive',
    form: 'powder',
    size: '29.8 oz',
    sizeOz: 29.8,
    stateContractBrand: true,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Abbott'
  },
  {
    upc: '0070074651781',
    brand: 'Similac',
    productName: 'Pro-Sensitive',
    formulaType: 'sensitive',
    form: 'ready_to_feed',
    size: '32 fl oz',
    sizeOz: 32,
    stateContractBrand: true,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Abbott'
  },

  // Gentle/Total Comfort
  {
    upc: '0070074647326',
    brand: 'Similac',
    productName: 'Pro-Total Comfort',
    formulaType: 'gentle',
    form: 'powder',
    size: '29.8 oz',
    sizeOz: 29.8,
    stateContractBrand: true,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Abbott'
  },

  // Hypoallergenic
  {
    upc: '0070074534497',
    brand: 'Similac',
    productName: 'Alimentum',
    formulaType: 'hypoallergenic',
    form: 'powder',
    size: '19.8 oz',
    sizeOz: 19.8,
    stateContractBrand: true,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Abbott'
  },
  {
    upc: '0070074534503',
    brand: 'Similac',
    productName: 'Alimentum',
    formulaType: 'hypoallergenic',
    form: 'ready_to_feed',
    size: '32 fl oz',
    sizeOz: 32,
    stateContractBrand: true,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Abbott'
  },

  // Soy
  {
    upc: '0070074559308',
    brand: 'Similac',
    productName: 'Soy Isomil',
    formulaType: 'soy',
    form: 'powder',
    size: '30.8 oz',
    sizeOz: 30.8,
    stateContractBrand: true,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Abbott'
  },

  // Organic
  {
    upc: '0070074653303',
    brand: 'Similac',
    productName: 'Organic',
    formulaType: 'organic',
    form: 'powder',
    size: '23.2 oz',
    sizeOz: 23.2,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Abbott'
  },

  // Specialty (Reflux)
  {
    upc: '0070074580944',
    brand: 'Similac',
    productName: 'Spit-Up',
    formulaType: 'specialty',
    form: 'powder',
    size: '19.5 oz',
    sizeOz: 19.5,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Abbott'
  },

  // ==================== ENFAMIL (Mead Johnson) ====================
  // Standard
  {
    upc: '0030087501513',
    brand: 'Enfamil',
    productName: 'NeuroPro',
    formulaType: 'standard',
    form: 'powder',
    size: '31.4 oz',
    sizeOz: 31.4,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Mead Johnson'
  },
  {
    upc: '0030087501520',
    brand: 'Enfamil',
    productName: 'NeuroPro',
    formulaType: 'standard',
    form: 'ready_to_feed',
    size: '32 fl oz',
    sizeOz: 32,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Mead Johnson'
  },
  {
    upc: '0030087500127',
    brand: 'Enfamil',
    productName: 'Infant',
    formulaType: 'standard',
    form: 'powder',
    size: '12.5 oz',
    sizeOz: 12.5,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Mead Johnson'
  },

  // Gentle
  {
    upc: '0030087501605',
    brand: 'Enfamil',
    productName: 'NeuroPro Gentlease',
    formulaType: 'gentle',
    form: 'powder',
    size: '30.4 oz',
    sizeOz: 30.4,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Mead Johnson'
  },
  {
    upc: '0030087503012',
    brand: 'Enfamil',
    productName: 'Gentlease',
    formulaType: 'gentle',
    form: 'powder',
    size: '12.4 oz',
    sizeOz: 12.4,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Mead Johnson'
  },

  // Sensitive
  {
    upc: '0030087501698',
    brand: 'Enfamil',
    productName: 'NeuroPro Sensitive',
    formulaType: 'sensitive',
    form: 'powder',
    size: '29.4 oz',
    sizeOz: 29.4,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Mead Johnson'
  },

  // Hypoallergenic
  {
    upc: '0030087504217',
    brand: 'Enfamil',
    productName: 'Nutramigen',
    formulaType: 'hypoallergenic',
    form: 'powder',
    size: '19.8 oz',
    sizeOz: 19.8,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Mead Johnson'
  },
  {
    upc: '0030087504224',
    brand: 'Enfamil',
    productName: 'Nutramigen',
    formulaType: 'hypoallergenic',
    form: 'ready_to_feed',
    size: '32 fl oz',
    sizeOz: 32,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Mead Johnson'
  },

  // Soy
  {
    upc: '0030087502915',
    brand: 'Enfamil',
    productName: 'ProSobee',
    formulaType: 'soy',
    form: 'powder',
    size: '30.8 oz',
    sizeOz: 30.8,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Mead Johnson'
  },

  // Specialty (Reflux)
  {
    upc: '0030087505313',
    brand: 'Enfamil',
    productName: 'A.R.',
    formulaType: 'specialty',
    form: 'powder',
    size: '19.5 oz',
    sizeOz: 19.5,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Mead Johnson'
  },

  // ==================== GERBER (Nestle) ====================
  // Standard
  {
    upc: '0050000000470',
    brand: 'Gerber',
    productName: 'Good Start GentlePro',
    formulaType: 'standard',
    form: 'powder',
    size: '30.6 oz',
    sizeOz: 30.6,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Nestle'
  },
  {
    upc: '0050000000487',
    brand: 'Gerber',
    productName: 'Good Start GentlePro',
    formulaType: 'standard',
    form: 'ready_to_feed',
    size: '32 fl oz',
    sizeOz: 32,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Nestle'
  },

  // Gentle
  {
    upc: '0050000000500',
    brand: 'Gerber',
    productName: 'Good Start SoothePro',
    formulaType: 'gentle',
    form: 'powder',
    size: '30.6 oz',
    sizeOz: 30.6,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Nestle'
  },

  // Soy
  {
    upc: '0050000000593',
    brand: 'Gerber',
    productName: 'Good Start Soy',
    formulaType: 'soy',
    form: 'powder',
    size: '30.6 oz',
    sizeOz: 30.6,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Nestle'
  },

  // ==================== STORE BRANDS ====================
  // Parent's Choice (Walmart)
  {
    upc: '0078742229690',
    brand: 'Parents Choice',
    productName: 'Advantage',
    formulaType: 'store_brand',
    form: 'powder',
    size: '35 oz',
    sizeOz: 35,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Perrigo'
  },
  {
    upc: '0078742229706',
    brand: 'Parents Choice',
    productName: 'Sensitivity',
    formulaType: 'store_brand',
    form: 'powder',
    size: '33.2 oz',
    sizeOz: 33.2,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Perrigo'
  },
  {
    upc: '0078742229713',
    brand: 'Parents Choice',
    productName: 'Gentle',
    formulaType: 'store_brand',
    form: 'powder',
    size: '33.2 oz',
    sizeOz: 33.2,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Perrigo'
  },

  // Up & Up (Target)
  {
    upc: '0492000305015',
    brand: 'Up & Up',
    productName: 'Infant Formula',
    formulaType: 'store_brand',
    form: 'powder',
    size: '35 oz',
    sizeOz: 35,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Perrigo'
  },
  {
    upc: '0492000305022',
    brand: 'Up & Up',
    productName: 'Sensitivity',
    formulaType: 'store_brand',
    form: 'powder',
    size: '33.2 oz',
    sizeOz: 33.2,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Perrigo'
  },

  // Comforts (Kroger)
  {
    upc: '0011110089380',
    brand: 'Comforts',
    productName: 'Infant Formula',
    formulaType: 'store_brand',
    form: 'powder',
    size: '35 oz',
    sizeOz: 35,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Perrigo'
  },

  // Meijer
  {
    upc: '0041250001234',
    brand: 'Meijer',
    productName: 'Infant Formula',
    formulaType: 'store_brand',
    form: 'powder',
    size: '35 oz',
    sizeOz: 35,
    stateContractBrand: false,
    statesApproved: ['MI'],
    manufacturer: 'Perrigo'
  },

  // Kirkland Signature (Costco)
  {
    upc: '0009659723456',
    brand: 'Kirkland Signature',
    productName: 'ProCare Non-GMO',
    formulaType: 'store_brand',
    form: 'powder',
    size: '42 oz',
    sizeOz: 42,
    stateContractBrand: false,
    statesApproved: ['MI', 'NC', 'FL', 'OR'],
    manufacturer: 'Perrigo'
  }
];

async function seedFormulas() {
  console.log('Seeding WIC formulas...\n');

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const formula of formulas) {
    try {
      const result = await pool.query(
        `INSERT INTO wic_formulas
         (upc, brand, product_name, formula_type, form, size, size_oz, state_contract_brand, states_approved, manufacturer)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (upc) DO UPDATE SET
           brand = EXCLUDED.brand,
           product_name = EXCLUDED.product_name,
           formula_type = EXCLUDED.formula_type,
           form = EXCLUDED.form,
           size = EXCLUDED.size,
           size_oz = EXCLUDED.size_oz,
           state_contract_brand = EXCLUDED.state_contract_brand,
           states_approved = EXCLUDED.states_approved,
           manufacturer = EXCLUDED.manufacturer,
           updated_at = CURRENT_TIMESTAMP
         RETURNING (xmax = 0) AS inserted`,
        [
          formula.upc,
          formula.brand,
          formula.productName,
          formula.formulaType,
          formula.form,
          formula.size,
          formula.sizeOz,
          formula.stateContractBrand,
          formula.statesApproved,
          formula.manufacturer
        ]
      );

      if (result.rows[0].inserted) {
        inserted++;
        console.log(`  ✅ Inserted: ${formula.brand} ${formula.productName} (${formula.form})`);
      } else {
        updated++;
        console.log(`  🔄 Updated: ${formula.brand} ${formula.productName} (${formula.form})`);
      }
    } catch (error: any) {
      errors++;
      console.error(`  ❌ Error: ${formula.brand} ${formula.productName} - ${error.message}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${formulas.length}`);

  process.exit(errors > 0 ? 1 : 0);
}

seedFormulas().catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
