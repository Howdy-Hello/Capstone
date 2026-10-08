// The browser and trusted API must use exactly the same deterministic engine.
const fs = require('node:fs');
const path = require('node:path');
const destination = path.join(__dirname, '../src/market');
fs.mkdirSync(destination, { recursive: true });
for (const name of ['mockStocks.ts', 'databaseMarket.ts', 'infiniteMarket.ts', 'sessionMarket.ts']) {
  const source = path.join(__dirname, '../../client/src/data', name);
  const target = path.join(destination, name);
  // Hosts with server/ as their root ship the committed market modules only.
  if (fs.existsSync(source)) {
    const header = name === 'databaseMarket.ts' ? ''
      : `// GENERATED from client/src/data/${name} by scripts/sync-market-engine.cjs.\n// Do not edit here -- edit the client file and re-run the script.\n`;
    fs.writeFileSync(target, header + fs.readFileSync(source, 'utf8'));
  } else if (!fs.existsSync(target)) {
    throw new Error(`Missing market engine: ${target}`);
  }
}
