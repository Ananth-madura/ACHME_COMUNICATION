const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function deepAudit() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'achme'
  });

  console.log("Connected to DB");

  // 1. Get all tables and columns from DB
  const [columns] = await db.execute(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_KEY, IS_NULLABLE 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = ?
  `, [process.env.DB_NAME || 'achme']);

  const dbSchema = {};
  for (const col of columns) {
    if (!dbSchema[col.TABLE_NAME]) dbSchema[col.TABLE_NAME] = {};
    dbSchema[col.TABLE_NAME][col.COLUMN_NAME] = col;
  }

  // 2. Scan backend routes for SQL queries
  const routesDir = path.join(__dirname, '../routes');
  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  
  const extractedTables = new Set();
  const extractedColumns = {};

  const queryRegex = /['"\`\n]((?:INSERT INTO|UPDATE|SELECT[\s\S]*?FROM|DELETE FROM)\s+([a-zA-Z0-9_]+)[\s\S]*?)['"\`\n]/gi;

  for (const file of files) {
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    let match;
    while ((match = queryRegex.exec(content)) !== null) {
      const fullQuery = match[1];
      const tableName = match[2].toLowerCase(); // MySQL tables often case-insensitive in Windows
      extractedTables.add(tableName);
      
      // Attempt to extract columns for INSERT INTO
      if (fullQuery.toUpperCase().startsWith('INSERT INTO')) {
        const colMatch = fullQuery.match(/\((.*?)\)/);
        if (colMatch) {
          const cols = colMatch[1].split(',').map(c => c.trim().replace(/[\`'"]/g, '').toLowerCase());
          if (!extractedColumns[tableName]) extractedColumns[tableName] = new Set();
          cols.forEach(c => {
            // filter out question marks and parameterized things
            if (/^[a-z0-9_]+$/i.test(c)) {
              extractedColumns[tableName].add(c);
            }
          });
        }
      }

      // Extract columns for UPDATE (e.g. UPDATE table SET col1 = ?, col2 = ?)
      if (fullQuery.toUpperCase().startsWith('UPDATE')) {
         const setMatch = fullQuery.match(/SET([\s\S]*?)(?:WHERE|$)/i);
         if (setMatch) {
           const sets = setMatch[1].split(',');
           if (!extractedColumns[tableName]) extractedColumns[tableName] = new Set();
           sets.forEach(s => {
             const col = s.split('=')[0].trim().replace(/[\`'"]/g, '').toLowerCase();
             if (/^[a-z0-9_]+$/i.test(col)) {
               extractedColumns[tableName].add(col);
             }
           });
         }
      }
    }
  }

  // 3. Compare extracted logic with actual DB schema
  console.log("\n--- DEEP AUDIT RESULTS ---");
  let missingCount = 0;

  for (const table of extractedTables) {
    // Find case-insensitive match for table
    const dbTable = Object.keys(dbSchema).find(t => t.toLowerCase() === table);
    
    if (!dbTable) {
      console.log(`❌ MISSING TABLE: ${table} (found in code, missing in DB)`);
      missingCount++;
      continue;
    }

    if (extractedColumns[table]) {
      for (const col of extractedColumns[table]) {
        const dbCol = Object.keys(dbSchema[dbTable]).find(c => c.toLowerCase() === col);
        if (!dbCol) {
          console.log(`❌ MISSING COLUMN: ${dbTable}.${col} (used in queries, missing in DB)`);
          missingCount++;
        }
      }
    }
  }

  if (missingCount === 0) {
    console.log("✅ All SQL queries in routes map cleanly to existing database structures.");
  } else {
    console.log(`\nFound ${missingCount} discrepancies between codebase and database schema.`);
  }

  // 4. Check for foreign key integrity / index issues
  console.log("\n--- INDEX / FOREIGN KEY AUDIT ---");
  const [indexes] = await db.execute(`
    SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = ? AND INDEX_NAME != 'PRIMARY'
  `, [process.env.DB_NAME || 'achme']);
  
  console.log(`Found ${indexes.length} secondary indexes.`);
  
  process.exit(0);
}

deepAudit().catch(err => {
  console.error("Audit failed:", err.message);
  process.exit(1);
});
