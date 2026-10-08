#!/usr/bin/env node
// Copies the shared market engine from the client into the API server.
//
// The server generates and stores each run's prices with the same code the
// client was built from, but CRA cannot import from outside client/src and the
// server compiles only server/src. So the files live in client/src/data and
// are copied here. `npm test` in server/ fails if the copies are stale.
//
//   node scripts/sync-market-engine.cjs          # write the copies
//   node scripts/sync-market-engine.cjs --check  # exit 1 if any copy differs

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "client", "src", "data");
const TARGET_DIR = path.join(ROOT, "server", "src", "market");
const FILES = ["mockStocks.ts", "infiniteMarket.ts", "sessionMarket.ts"];

function header(file) {
  return (
    `// GENERATED from client/src/data/${file} by scripts/sync-market-engine.cjs.\n` +
    "// Do not edit here -- edit the client file and re-run the script.\n"
  );
}

// Git on Windows (core.autocrlf) checks files out with CRLF, so compare and
// write with LF only; otherwise every Windows checkout reads as stale.
function lf(text) {
  return text.replace(/\r\n/g, "\n");
}

function expected(file) {
  return lf(header(file) + fs.readFileSync(path.join(SOURCE_DIR, file), "utf8"));
}

const check = process.argv.includes("--check");
let stale = 0;

fs.mkdirSync(TARGET_DIR, { recursive: true });
for (const file of FILES) {
  const target = path.join(TARGET_DIR, file);
  const want = expected(file);
  const have = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
  if (have !== null && lf(have) === want) continue;
  if (check) {
    console.error(`stale: server/src/market/${file}`);
    stale += 1;
  } else {
    fs.writeFileSync(target, want);
    console.log(`wrote server/src/market/${file}`);
  }
}

if (check && stale > 0) {
  console.error("Run: node scripts/sync-market-engine.cjs");
  process.exit(1);
}
