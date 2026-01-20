import * as XLSX from 'xlsx';
import * as path from 'path';

/**
 * Inspect Michigan APL Excel files to understand their structure
 */

const files = [
  'michigan-apl.xlsx',
  '18012026-michigan-egg-upc.xlsx',
  '18012026-michigan-wic-plu.xlsx'
];

files.forEach(filename => {
  const filePath = path.join(__dirname, '../../data', filename);

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 Inspecting: ${filename}`);
    console.log('='.repeat(60));

    const workbook = XLSX.readFile(filePath);

    console.log(`\n📋 Sheets found: ${workbook.SheetNames.join(', ')}\n`);

    // Inspect each sheet
    workbook.SheetNames.forEach((sheetName, idx) => {
      console.log(`\n--- Sheet ${idx + 1}: "${sheetName}" ---`);
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      console.log(`Rows: ${data.length}`);

      if (data.length > 0) {
        // Show column names from first row
        console.log('\nColumns:');
        Object.keys(data[0] as Record<string, any>).forEach(col => {
          console.log(`  - ${col}`);
        });

        // Show first 3 rows as sample
        console.log('\nSample data (first 3 rows):');
        data.slice(0, 3).forEach((row, idx) => {
          console.log(`\nRow ${idx + 1}:`);
          Object.entries(row as Record<string, any>).forEach(([key, val]) => {
            const value = val ? String(val).substring(0, 50) : '';
            console.log(`  ${key}: ${value}`);
          });
        });
      } else {
        console.log('(Empty sheet)');
      }
    });

  } catch (err) {
    console.error(`❌ Error reading ${filename}:`, err);
  }
});

console.log(`\n${'='.repeat(60)}\n`);
