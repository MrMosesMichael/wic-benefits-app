import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Export Michigan APL data from Excel to JSON for offline app use
 * Outputs to: app/assets/data/michigan-apl.json
 */

interface APLProduct {
  upc: string;
  brand: string;
  description: string;
  category: string;
  subcategory: string;
  size: string;
  unit: string;
}

// Map WIC category codes to app benefit categories
function mapCategory(catCode: string, catDesc: string): string {
  const code = catCode?.toString().trim();
  const desc = (catDesc || '').toLowerCase();

  if (desc.includes('milk') && !desc.includes('formula')) return 'milk';
  if (desc.includes('cheese')) return 'cheese';
  if (desc.includes('egg')) return 'eggs';
  if (desc.includes('juice')) return 'juice';
  if (desc.includes('cereal') && !desc.includes('infant')) return 'cereal';
  if (desc.includes('grain') || desc.includes('bread') || desc.includes('tortilla') || desc.includes('rice') || desc.includes('pasta')) return 'whole_grains';
  if (desc.includes('peanut butter')) return 'peanut_butter';
  if (desc.includes('bean') || desc.includes('legume') || desc.includes('peas') || desc.includes('lentil')) return 'legumes';
  if (desc.includes('fish') || desc.includes('tuna') || desc.includes('salmon') || desc.includes('sardine')) return 'fish';
  if (desc.includes('fruit') || desc.includes('vegetable') || desc.includes('produce')) return 'fruits_vegetables';
  if (desc.includes('formula')) return 'infant_formula';
  if (desc.includes('infant') && (desc.includes('food') || desc.includes('cereal') || desc.includes('meat'))) return 'infant_food';
  if (desc.includes('yogurt')) return 'yogurt';
  if (desc.includes('tofu') || desc.includes('soy beverage')) return 'tofu';

  // Fall back to code-based mapping
  switch (code) {
    case '1': return 'milk';
    case '2': return 'cheese';
    case '3': return 'eggs';
    case '4': return 'juice';
    case '5': return 'cereal';
    case '6': return 'whole_grains';
    case '7': return 'peanut_butter';
    case '8': return 'legumes';
    case '9': return 'fish';
    case '10': return 'fruits_vegetables';
    case '11': return 'infant_formula';
    case '12': return 'infant_food';
    default: return 'other';
  }
}

// Normalize UPC to consistent format (remove leading zeros for matching, but keep original)
function normalizeUpc(upc: string): string {
  if (!upc) return '';
  return upc.toString().replace(/\D/g, '').replace(/^0+/, '') || '0';
}

async function exportAplToJson() {
  console.log('Exporting Michigan APL to JSON...\n');

  const dataDir = path.join(__dirname, '../../data');
  const outputDir = path.join(__dirname, '../../../app/assets/data');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const products: APLProduct[] = [];
  const seenUpcs = new Set<string>();

  // 1. Import main Michigan APL
  console.log('Processing michigan-apl.xlsx...');
  const aplPath = path.join(dataDir, 'michigan-apl.xlsx');
  if (fs.existsSync(aplPath)) {
    const workbook = XLSX.readFile(aplPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Skip header row by starting from row 2
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Find the actual header row (should be row 1, index 0)
    // Data starts at row 2 (index 1)
    // Actual column indices based on inspection:
    // 0: Category, 1: Cat Desc, 2: SubCat, 3: Subcat Desc, 4: UPC/PLU
    // 5: Brand Name, 6: Food Description, 7: Package Size
    // 8: Product Description, 9: Unit of Measure

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 5) continue;

      const rawUpc = (row[4] || '').toString().trim();
      const upc = normalizeUpc(rawUpc);
      if (!upc || seenUpcs.has(upc)) continue;

      const catCode = (row[0] || '').toString().trim();
      const catDesc = (row[1] || '').toString().trim();

      seenUpcs.add(upc);
      products.push({
        upc,
        brand: (row[5] || '').toString().trim(),
        description: (row[6] || row[8] || '').toString().trim(),
        category: mapCategory(catCode, catDesc),
        subcategory: (row[3] || '').toString().trim(),
        size: (row[7] || '').toString().trim(),
        unit: (row[9] || '').toString().trim()
      });
    }
    console.log(`  - Loaded ${products.length} products from APL`);
  }

  // 2. Import egg UPCs
  console.log('Processing egg UPCs...');
  const eggPath = path.join(dataDir, '18012026-michigan-egg-upc.xlsx');
  if (fs.existsSync(eggPath)) {
    const workbook = XLSX.readFile(eggPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    let eggCount = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const rawUpc = (row[2] || '').toString().trim(); // UPC is usually column 3
      const upc = normalizeUpc(rawUpc);
      if (!upc || seenUpcs.has(upc)) continue;

      seenUpcs.add(upc);
      eggCount++;
      products.push({
        upc,
        brand: (row[3] || '').toString().trim(),
        description: (row[4] || 'Cage-Free Eggs').toString().trim(),
        category: 'eggs',
        subcategory: 'Cage-Free',
        size: '',
        unit: 'dozen'
      });
    }
    console.log(`  - Loaded ${eggCount} egg products`);
  }

  // 3. Import PLUs for fresh produce
  console.log('Processing PLU data...');
  const pluPath = path.join(dataDir, '18012026-michigan-wic-plu.xlsx');
  if (fs.existsSync(pluPath)) {
    const workbook = XLSX.readFile(pluPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    let pluCount = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const plu = (row[0] || row[2] || '').toString().trim();
      if (!plu || seenUpcs.has(plu)) continue;

      seenUpcs.add(plu);
      pluCount++;
      products.push({
        upc: plu,
        brand: '',
        description: `${row[4] || ''} ${row[5] || ''}`.trim() || 'Fresh Produce',
        category: 'fruits_vegetables',
        subcategory: (row[3] || 'Produce').toString().trim(),
        size: (row[6] || '').toString().trim(),
        unit: 'lb'
      });
    }
    console.log(`  - Loaded ${pluCount} PLU items`);
  }

  // Sort by category then brand
  products.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.brand.localeCompare(b.brand);
  });

  // Output JSON
  const outputPath = path.join(outputDir, 'michigan-apl.json');
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));

  console.log(`\n✅ Exported ${products.length} products to ${outputPath}`);

  // Print category breakdown
  const categories: Record<string, number> = {};
  products.forEach(p => {
    categories[p.category] = (categories[p.category] || 0) + 1;
  });
  console.log('\nCategory breakdown:');
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });

  // Show sample products
  console.log('\nSample products:');
  products.slice(0, 3).forEach(p => {
    console.log(`  ${p.upc}: ${p.brand} - ${p.description} (${p.category})`);
  });
}

exportAplToJson().catch(console.error);
