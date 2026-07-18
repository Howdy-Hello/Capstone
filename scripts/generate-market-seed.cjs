const fs = require("fs");
const path = require("path");
const ts = require("../client/node_modules/typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: filename,
  });

  module._compile(compiled.outputText, filename);
};

const market = require("../client/src/data/mockStocks.ts");

const seedCode = market.normalizeMarketSeed(process.argv[2]);
const output = path.resolve(
  __dirname,
  "../supabase/seed/market_30_day_seed.json"
);

const seed = market.generateThirtyDayMarketSeed(seedCode);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(seed, null, 2)}\n`);

console.log(`Generated ${path.relative(process.cwd(), output)}`);
console.log(`Seed: ${seed.seedCode}`);
console.log(`Story arcs: ${seed.storyArcs.join(", ")}`);
console.log(`Stocks: ${seed.stocks.length}`);
console.log(`Prices: ${seed.prices.length}`);
console.log(`Events: ${seed.events.length}`);
console.log(`Impacts: ${seed.events.reduce(
  (total, event) => total + event.impacts.length,
  0
)}`);
