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

// branching : code qui choisit entre FR et EN (une 3e langue y recevrait du français) → à supprimer.
// contentMaps : contenu rangé par langue hors dictionnaires ({ fr: …, en: … } lu via pickLocalized) :
// sûr, mais chaque nouvelle langue doit y être ajoutée à la main.
const HARDCODED_LOCALE_PATTERNS = {
  branching: [
    { label: "comparaison à un code de langue (locale === 'en')", regex: /[!=]==?\s*['"](?:fr|en)['"]|['"](?:fr|en)['"]\s*[!=]==?/g },
    { label: 'drapeau isEn / isFr / isEnglish', regex: /\bis(?:En|Fr|English|French)\b/g },
    { label: "locale Intl en dur ('fr-FR')", regex: /['"](?:fr-FR|en-US|en-GB)['"]/g },
  ],
  contentMaps: [
    { label: 'objet { fr: …, en: … } hors dictionnaires', regex: /\b(?:fr|en)\s*:\s*['"`{[]/g },
  ],
};
const KIND_TITLES = {
  branching: 'New FR/EN branching code (use t() / translate() with the dictionaries, LOCALE_META or lib/i18n/format.js):',
  contentMaps: 'New { fr, en } content outside the dictionaries (prefer a dictionary key; otherwise read it with pickLocalized):',
};

const ADMIN_FILES_TO_CHECK = [
  path.join(rootDir, 'app', 'admin', 'AdminClient.js'),
  path.join(rootDir, 'app', 'admin', 'billing', 'BillingAdminClient.js')
];

// Valeur plurielle ({ one, other } en FR/EN, jusqu'à 6 formes en arabe) : une seule clé,
// chaque langue choisit ses formes (lib/i18n/plural.js).
const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'];
const isPluralValue = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  && 'other' in value && Object.keys(value).every((key) => PLURAL_CATEGORIES.includes(key));

function flattenObjectKeys(source, prefix = '') {
  const acc = [];
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return acc;
  }
  for (const [key, value] of Object.entries(source)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !isPluralValue(value)) {
      acc.push(...flattenObjectKeys(value, nextKey));
    } else {
      acc.push(nextKey);
    }
  }
  return acc;
}

function extractPlaceholders(value) {
  const set = new Set();
  const text = isPluralValue(value) ? Object.values(value).join(' ') : String(value ?? '');
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
  const counts = Object.fromEntries(Object.keys(HARDCODED_LOCALE_PATTERNS).map((kind) => [kind, {}]));
  for (const dir of SOURCE_DIRS) {
    for (const filePath of await listSourceFiles(path.join(rootDir, dir))) {
      const relative = path.relative(rootDir, filePath);
      if (SOURCE_EXCLUDES.some((prefix) => relative.startsWith(prefix))) continue;
      const content = await fs.readFile(filePath, 'utf8');
      for (const [kind, patterns] of Object.entries(HARDCODED_LOCALE_PATTERNS)) {
        const count = patterns.reduce((sum, { regex }) => sum + (content.match(regex) || []).length, 0);
        if (count) counts[kind][relative.split(path.sep).join('/')] = count;
      }
    }
  }
  for (const kind of Object.keys(counts)) {
    counts[kind] = Object.fromEntries(Object.entries(counts[kind]).sort(([a], [b]) => a.localeCompare(b)));
  }
  return counts;
}

const sum = (values) => Object.values(values).reduce((total, value) => total + value, 0);

// Cliquet : chaque type ne peut que diminuer, fichier par fichier. Resserrer avec --update-baseline.
async function checkHardcodedLocaleBaseline(updateBaseline) {
  const counts = await countHardcodedLocaleCode();
  const summary = Object.entries(counts)
    .map(([kind, files]) => `${kind}: ${sum(files)} occurrences in ${Object.keys(files).length} files`)
    .join(' · ');

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

  const errors = [];
  const stale = [];
  for (const [kind, files] of Object.entries(counts)) {
    const allowedFiles = baseline[kind] || {};
    const increased = [];
    for (const [file, count] of Object.entries(files)) {
      const allowed = allowedFiles[file] || 0;
      if (count > allowed) increased.push(`${file}: ${count} (baseline ${allowed})`);
      else if (count < allowed) stale.push(`${kind} · ${file}: ${count} (baseline ${allowed})`);
    }
    for (const [file, allowed] of Object.entries(allowedFiles)) {
      if (!files[file]) stale.push(`${kind} · ${file}: 0 (baseline ${allowed})`);
    }
    errors.push(...formatList(KIND_TITLES[kind], increased));
    if (increased.length) errors.push(...HARDCODED_LOCALE_PATTERNS[kind].map(({ label }) => `  pattern: ${label}`));
  }
  errors.push(...formatList('Baseline is stale (good news): run `npm run lint:i18n -- --update-baseline`:', stale));
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

  const { ALL_LOCALES, DEFAULT_LOCALE } = await importModule(path.join(I18N_DIR, 'routing.js'));
  const parity = await checkDictionaryParity(ALL_LOCALES, DEFAULT_LOCALE);
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
