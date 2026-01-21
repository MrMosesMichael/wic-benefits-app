#!/usr/bin/env node
/**
 * Eligibility Check CLI Tool
 *
 * Command-line tool for checking WIC product eligibility.
 *
 * Usage:
 *   npm run eligibility:check <upc> <state> [options]
 *   node check-eligibility.js 016000275287 MI
 *
 * @module services/eligibility/cli/check-eligibility
 */

import { Pool } from 'pg';
import { EligibilityService } from '../EligibilityService';
import { StateRulesConfig } from '../StateRulesConfig';

/**
 * Parse command line arguments
 */
function parseArgs(): {
  upc?: string;
  state?: string;
  brand?: string;
  size?: number;
  sizeUnit?: string;
  category?: string;
  showPolicy?: boolean;
  help?: boolean;
} {
  const args = process.argv.slice(2);
  const parsed: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--policy' || arg === '-p') {
      parsed.showPolicy = true;
    } else if (arg === '--brand' || arg === '-b') {
      parsed.brand = args[++i];
    } else if (arg === '--size' || arg === '-s') {
      parsed.size = parseFloat(args[++i]);
    } else if (arg === '--unit' || arg === '-u') {
      parsed.sizeUnit = args[++i];
    } else if (arg === '--category' || arg === '-c') {
      parsed.category = args[++i];
    } else if (!parsed.upc) {
      parsed.upc = arg;
    } else if (!parsed.state) {
      parsed.state = arg.toUpperCase();
    }
  }

  return parsed;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
WIC Eligibility Check Tool

Usage:
  npm run eligibility:check <upc> <state> [options]

Arguments:
  <upc>         Product UPC code (12-14 digits)
  <state>       State code (MI, NC, FL, OR)

Options:
  -b, --brand <brand>       Product brand name
  -s, --size <size>         Product size (numeric)
  -u, --unit <unit>         Size unit (oz, lb, gal, etc.)
  -c, --category <category> Product category (cereal, milk, etc.)
  -p, --policy              Show state policy summary
  -h, --help                Show this help message

Examples:
  # Basic check
  npm run eligibility:check 016000275287 MI

  # Check with product details
  npm run eligibility:check 016000275287 MI --brand Cheerios --size 12 --unit oz

  # Show state policy
  npm run eligibility:check --policy MI

Environment Variables:
  DATABASE_URL    PostgreSQL connection string (required)

States Supported:
  MI - Michigan
  NC - North Carolina
  FL - Florida
  OR - Oregon
`);
}

/**
 * Main CLI function
 */
async function main() {
  const args = parseArgs();

  // Show help
  if (args.help) {
    showHelp();
    return;
  }

  // Show policy summary
  if (args.showPolicy) {
    if (!args.state) {
      console.error('Error: State required for policy summary');
      console.log('Usage: npm run eligibility:check --policy <state>');
      process.exit(1);
    }

    console.log(StateRulesConfig.getPolicySummary(args.state));
    return;
  }

  // Validate required args
  if (!args.upc || !args.state) {
    console.error('Error: UPC and state are required');
    console.log('Usage: npm run eligibility:check <upc> <state>');
    console.log('Run with --help for more information');
    process.exit(1);
  }

  // Validate state
  if (!StateRulesConfig.isStateSupported(args.state)) {
    console.error(`Error: State '${args.state}' is not supported`);
    console.log('Supported states: MI, NC, FL, OR');
    process.exit(1);
  }

  // Check database connection
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  // Create database pool
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const service = new EligibilityService(dbPool);

  try {
    console.log('Checking eligibility...\n');

    // Perform eligibility check
    const result = await service.checkEligibility({
      upc: args.upc,
      state: args.state,
      product: {
        brand: args.brand,
        size: args.size,
        sizeUnit: args.sizeUnit,
        category: args.category,
      },
      includeAlternatives: true,
    });

    // Display results
    console.log('='.repeat(60));
    console.log('ELIGIBILITY CHECK RESULT');
    console.log('='.repeat(60));
    console.log(`UPC:    ${result.upc}`);
    console.log(`State:  ${result.state}`);
    console.log(`Status: ${result.eligible ? '✓ WIC ELIGIBLE' : '✗ NOT ELIGIBLE'}`);
    console.log(`Confidence: ${result.confidence}%`);

    if (result.aplEntry) {
      console.log('\nProduct Information:');
      console.log(`  Category: ${result.aplEntry.benefitCategory}`);
      if (result.aplEntry.benefitSubcategory) {
        console.log(`  Subcategory: ${result.aplEntry.benefitSubcategory}`);
      }
      console.log(`  Data Source: ${result.aplEntry.dataSource.toUpperCase()}`);
      console.log(`  Last Updated: ${result.aplEntry.lastUpdated}`);
    }

    if (!result.eligible && result.ineligibilityReason) {
      console.log('\nReason for Ineligibility:');
      console.log(`  ${result.ineligibilityReason}`);
    }

    if (result.eligibleParticipants.length > 0) {
      console.log('\nEligible Participants:');
      result.eligibleParticipants.forEach(p => console.log(`  - ${p}`));
    }

    if (result.ineligibleParticipants.length > 0) {
      console.log('\nIneligible Participants:');
      result.ineligibleParticipants.forEach(p => console.log(`  - ${p}`));
    }

    if (result.ruleViolations.length > 0) {
      console.log('\nRule Violations:');
      result.ruleViolations.forEach((violation, i) => {
        console.log(`\n  ${i + 1}. ${violation.rule}`);
        console.log(`     Severity: ${violation.severity}`);
        console.log(`     Message: ${violation.message}`);
        if (violation.expected) {
          console.log(`     Expected: ${JSON.stringify(violation.expected)}`);
        }
        if (violation.actual) {
          console.log(`     Actual: ${JSON.stringify(violation.actual)}`);
        }
      });
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(w => console.log(`  ⚠ ${w}`));
    }

    if (result.alternatives && result.alternatives.length > 0) {
      console.log('\nSuggested Alternatives:');
      result.alternatives.forEach(alt => console.log(`  - ${alt}`));
    }

    if (result.dataAgeMs !== undefined) {
      const ageMinutes = Math.round(result.dataAgeMs / 60000);
      console.log(`\nData Age: ${ageMinutes} minutes`);
    }

    if (result.lastSync) {
      console.log(`Last APL Sync: ${result.lastSync}`);
    }

    console.log('='.repeat(60));

    // Exit with appropriate code
    process.exit(result.eligible ? 0 : 1);
  } catch (error) {
    console.error('\nError:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(2);
  } finally {
    await dbPool.end();
  }
}

// Run CLI
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(2);
  });
}

export { main };
