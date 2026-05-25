// Kopieert sql-wasm.wasm uit node_modules naar /public zodat sql.js het via fetch kan laden.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm");
const destDir = path.join(__dirname, "..", "public");
const dest = path.join(destDir, "sql-wasm.wasm");

if (!fs.existsSync(src)) {
  console.warn("[copy-wasm] Bron niet gevonden:", src, "— sla over (eerst `npm install`).");
  process.exit(0);
}
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("[copy-wasm] sql-wasm.wasm gekopieerd naar /public");
