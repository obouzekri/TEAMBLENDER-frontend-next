#!/usr/bin/env node
// Typography guard (PR template "Typography Checklist"):
// - fonts are declared once, as tokens, in app/styles/01-tokens-and-themes.css (--font-ui, --font-display);
// - app code uses those tokens: no hardcoded "Inter" / "Roboto", no font family outside a token,
//   except monospace stacks (code, identifiers) and documents rendered outside the app.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SCAN_DIRS = ['app', 'components', 'lib'];
const SKIP_DIRS = new Set(['node_modules', '.next', 'dictionaries']);
const TOKEN_FILE = 'app/styles/01-tokens-and-themes.css';
// Standalone documents: they are opened outside the app, where the CSS tokens do not exist.
const STANDALONE_FILES = new Set([
  'components/Challenges/LabDInnovation/labReport.js', // downloadable HTML report
]);

const FONT_DECLARATION = /(?:font-family\s*:|fontFamily\s*[:=])\s*(\{?\s*['"`]?)([^;}\n]*)/g;
const HARDCODED_FONT = /\b(Inter|Roboto)\b/;
const ALLOWED_VALUE = /^(?:\{\s*)?['"`]?\s*(?:var\(--font-|inherit\b|monospace\b|ui-monospace\b)/;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(css|js|jsx|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const problems = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(path.join(root, dir))) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (relative === TOKEN_FILE || STANDALONE_FILES.has(relative)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const match of line.matchAll(FONT_DECLARATION)) {
        const value = `${match[1]}${match[2]}`.trim();
        if (HARDCODED_FONT.test(value)) {
          problems.push(`${relative}:${index + 1}: hardcoded font (${value}). Use var(--font-ui) or var(--font-display).`);
        } else if (!ALLOWED_VALUE.test(value)) {
          problems.push(`${relative}:${index + 1}: font family outside the tokens (${value}).`);
        }
      }
    });
  }
}

if (problems.length) {
  console.error(`check:typography failed (${problems.length}):\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('check:typography OK: fonts come from --font-ui / --font-display (monospace allowed).');
