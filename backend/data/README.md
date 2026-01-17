# APL Data Directory

This directory stores Approved Product List (APL) data files for importing into the database.

## Michigan WIC APL

### Data Source

**Official Source**: [Michigan WIC Approved Foods](https://www.michigan.gov/mdhhs/assistance-programs/wic/wicvendors/wic-foods)

**Format**: Excel spreadsheet (.xlsx)
**Processor**: FIS (Fidelity Information Services)
**Update Frequency**: Monthly
**Content**: Complete list of WIC-approved product UPCs and PLUs for fruits/vegetables

### How to Download

1. Visit https://www.michigan.gov/mdhhs/assistance-programs/wic/wicvendors/wic-foods
2. Look for "WIC Approved Product List" or "APL" download link
3. Download the Excel file
4. Save as `michigan-apl.xlsx` in this directory

### Expected File Structure

The Excel file should contain columns like:
- UPC/PLU code
- Product name
- Brand
- Size
- Category
- Subcategory
- Restrictions (if any)

### Import to Database

Once you have downloaded the file:

```bash
# From backend directory
npm run import-apl
```

This will:
1. Parse the Excel file
2. Clear existing Michigan APL data
3. Import all products into the `apl_products` table
4. Show import statistics

## Alternative: Mock Data

For development/testing without the official APL file, the database migration (`001_initial_schema.sql`) includes sample products:
- Whole Milk (Great Value)
- 2% Milk (Great Value)
- Large White Eggs (Great Value)
- Cheerios (General Mills)
- Jif Peanut Butter

## Data Sources for Other States

### North Carolina
- Processor: Conduent
- Source: TBD

### Florida
- Processor: FIS
- Source: TBD

### Oregon
- Processor: State-specific
- Source: TBD
