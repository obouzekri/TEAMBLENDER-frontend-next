import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promises as fs } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const I18N_DIR = path.join(rootDir, 'lib', 'i18n');
const DICTIONARIES_DIR = path.join(I18N_DIR, 'dictionaries');
const BASELINE_PATH = path.join(__dirname, 'i18n-hardcoded-baseline.json');
const SOURCE_DIRS = ['app', 'components', 'lib'];
// Le module i18n est le seul endroit autorisé à connaître les codes de langue.
const SOURCE_EXCLUDES = [`lib${path.sep}i18n${path.sep}`];

// Code qui suppose deux langues (FR/EN) au lieu de passer par les dictionnaires et LOCALE_META.
const HARDCODED_LOCALE_PATTERNS = [
  { label: "comparaison à un code de langue (locale === 'en')", regex: /[!=]==?\s*['"](?:fr|en)['"]|['"](?:fr|en)['"]\s*[!=]==?/g },
  { label: 'drapeau isEn / isFr', regex: /\bis(?:En|Fr)\b/g },
  { label: 'objet inline { fr: …, en: … }', regex: /\b(?:fr|en)\s*:\s*['"`{[]/g },
  { label: "locale Intl en dur ('fr-FR')", regex: /['"](?:fr-FR|en-US|en-GB)['"]/g },
];

const ADMIN_FILES_TO_CHECK = [
  path.join(rootDir, 'app', 'admin', 'AdminClient.js'),
  path.join(rootDir, 'app', 'admin', 'billing', 'BillingAdminClient.js')
];

function flattenObjectKeys(source, prefix = '') {
  const acc = [];
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return acc;
  }
  for (const [key, value] of Object.entries(source)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      acc.push(...flattenObjectKeys(value, nextKey));
    } else {
      acc.push(nextKey);
    }
  }
  return acc;
}

function extractPlaceholders(value) {
  const set = new Set();
  const text = String(value ?? '');
  const regex = /\{(\w+)\}/g;
  let match = regex.exec(text);
  while (match) {
    set.add(match[1]);
    match = regex.exec(text);
  }
  return set;
}

function setsEqual(a, b) {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

function getByPath(source, dotPath) {
  const parts = String(dotPath).split('.').filter(Boolean);
  let current = source;
  for (const part of parts) {
    if (current == null || typeof current !== 'object' || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function formatList(title, items) {
  if (!items.length) {
    return [];
  }
  return [title, ...items.map((item) => `  - ${item}`)];
}

async function importModule(filePath) {
  const module = await import(pathToFileURL(filePath).href);
  return module.default || module;
}

// Chaque dictionnaire doit avoir exactement les clés et les variables {x} du dictionnaire de référence.
async function checkDictionaryParity(locales, referenceLocale) {
  const load = (locale) => importModule(path.join(DICTIONARIES_DIR, `${locale}.js`));
  const reference = await load(referenceLocale);
  const referenceKeys = new Set(flattenObjectKeys(reference));
  const ref = referenceLocale.toUpperCase();
  const output = [];

  for (const locale of locales.filter((entry) => entry !== referenceLocale)) {
    const dictionary = await load(locale);
    const keys = new Set(flattenObjectKeys(dictionary));
    const tag = locale.toUpperCase();
    const missing = [...referenceKeys].filter((key) => !keys.has(key)).sort();
    const extra = [...keys].filter((key) => !referenceKeys.has(key)).sort();
    const placeholderMismatches = [...referenceKeys]
      .filter((key) => keys.has(key))
      .filter((key) => !setsEqual(extractPlaceholders(getByPath(reference, key)), extractPlaceholders(getByPath(dictionary, key))));

    output.push(...formatList(`Missing keys in ${tag} dictionary:`, missing));
    output.push(...formatList(`Keys in ${tag} dictionary missing from ${ref}:`, extra));
    output.push(...formatList(`Placeholder mismatch between ${ref}/${tag}:`, placeholderMismatches));
  }

  return output;
}

async function listSourceFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return /\.(?:js|jsx|mjs)$/.test(entry.name) ? [fullPath] : [];
  }));
  return files.flat();
}

async function countHardcodedLocaleCode() {
  const counts = {};
  for (const dir of SOURCE_DIRS) {
    for (const filePath of await listSourceFiles(path.join(rootDir, dir))) {
      const relative = path.relative(rootDir, filePath);
      if (SOURCE_EXCLUDES.some((prefix) => relative.startsWith(prefix))) continue;
      const content = await fs.readFile(filePath, 'utf8');
      const count = HARDCODED_LOCALE_PATTERNS.reduce((sum, { regex }) => sum + (content.match(regex) || []).length, 0);
      if (count) counts[relative.split(path.sep).join('/')] = count;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

// Cliquet : le code FR/EN en dur ne peut que diminuer. Resserrer la baseline avec --update-baseline.
async function checkHardcodedLocaleBaseline(updateBaseline) {
  const counts = await countHardcodedLocaleCode();
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const summary = `Hardcoded FR/EN code remaining: ${total} occurrences in ${Object.keys(counts).length} files.`;

  if (updateBaseline) {
    await fs.writeFile(BASELINE_PATH, `${JSON.stringify(counts, null, 2)}\n`);
    return { errors: [], summary: `Baseline updated. ${summary}` };
  }

  let baseline = {};
  try {
    baseline = JSON.parse(await fs.readFile(BASELINE_PATH, 'utf8'));
  } catch {
    // Pas de baseline : tout le code en dur est signalé.
  }

  const increased = [];
  const stale = [];
  for (const [file, count] of Object.entries(counts)) {
    const allowed = baseline[file] || 0;
    if (count > allowed) increased.push(`${file}: ${count} (baseline ${allowed})`);
    else if (count < allowed) stale.push(`${file}: ${count} (baseline ${allowed})`);
  }
  for (const [file, allowed] of Object.entries(baseline)) {
    if (!counts[file]) stale.push(`${file}: 0 (baseline ${allowed})`);
  }

  const errors = [
    ...formatList('New FR/EN-only code (use t() with the dictionaries, LOCALE_META or lib/i18n/format.js):', increased),
    ...(increased.length ? HARDCODED_LOCALE_PATTERNS.map(({ label }) => `  pattern: ${label}`) : []),
    ...formatList('Baseline is stale (good news): run `npm run lint:i18n -- --update-baseline`:', stale),
  ];
  return { errors, summary };
}

async function checkAdminRuntimeStrings() {
  const problems = [];
  const regex = /(alert|confirm|prompt)\s*\(\s*(["'`])([\s\S]*?)\2\s*[,)]/g;

  for (const filePath of ADMIN_FILES_TO_CHECK) {
    let content;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }

    let match = regex.exec(content);
    while (match) {
      const literal = String(match[3] || '').trim();
      if (literal.length > 0) {
        const line = content.slice(0, match.index).split('\n').length;
        const shortLiteral = literal.length > 80 ? `${literal.slice(0, 77)}...` : literal;
        problems.push(`${path.relative(rootDir, filePath)}:${line} -> ${match[1]}("${shortLiteral}")`);
      }
      match = regex.exec(content);
    }
  }

  return problems;
}

async function main() {
  const output = [];
  let hasError = false;

  const { SUPPORTED_LOCALES, DEFAULT_LOCALE } = await importModule(path.join(I18N_DIR, 'routing.js'));
  const parity = await checkDictionaryParity(SUPPORTED_LOCALES, DEFAULT_LOCALE);
  output.push(...parity);
  if (parity.length) {
    hasError = true;
  }

  const baseline = await checkHardcodedLocaleBaseline(process.argv.includes('--update-baseline'));
  output.push(...baseline.errors);
  if (baseline.errors.length) {
    hasError = true;
  }

  const runtimeLiterals = await checkAdminRuntimeStrings();
  output.push(...formatList('Hardcoded runtime literals found in admin files:', runtimeLiterals));
  if (runtimeLiterals.length) {
    hasError = true;
  }

  if (hasError) {
    console.error('i18n checks failed.');
    for (const line of output) {
      console.error(line);
    }
    process.exit(1);
  }

  console.log(baseline.summary);
  console.log('i18n checks passed.');
}

main().catch((error) => {
  console.error('i18n checks failed with unexpected error.');
  console.error(error);
  process.exit(1);
});
