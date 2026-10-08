// The browser and trusted API must use exactly the same deterministic engine.
const fs = require('node:fs');
const path = require('node:path');
const destination = path.join(__dirname, '../src/market');
fs.mkdirSync(destination, { recursive: true });
for (const name of ['mockStocks.ts', 'databaseMarket.ts']) {
  fs.copyFileSync(path.join(__dirname, '../../client/src/data', name), path.join(destination, name));
}
