import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promises as fs } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const FR_DICT_PATH = path.join(rootDir, 'lib', 'i18n', 'dictionaries', 'fr.js');
const EN_DICT_PATH = path.join(rootDir, 'lib', 'i18n', 'dictionaries', 'en.js');

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

async function importDictionary(filePath) {
  const module = await import(pathToFileURL(filePath).href);
  return module.default || module;
}

async function checkDictionaryParity() {
  const fr = await importDictionary(FR_DICT_PATH);
  const en = await importDictionary(EN_DICT_PATH);

  const frKeys = new Set(flattenObjectKeys(fr));
  const enKeys = new Set(flattenObjectKeys(en));

  const missingInEn = [...frKeys].filter((key) => !enKeys.has(key)).sort();
  const missingInFr = [...enKeys].filter((key) => !frKeys.has(key)).sort();

  const placeholderMismatches = [];
  for (const key of [...frKeys].filter((entry) => enKeys.has(entry))) {
    const frValue = getByPath(fr, key);
    const enValue = getByPath(en, key);
    const frPlaceholders = extractPlaceholders(frValue);
    const enPlaceholders = extractPlaceholders(enValue);
    if (!setsEqual(frPlaceholders, enPlaceholders)) {
      placeholderMismatches.push(key);
    }
  }

  return { missingInEn, missingInFr, placeholderMismatches };
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

  const parity = await checkDictionaryParity();
  output.push(...formatList('Missing keys in EN dictionary:', parity.missingInEn));
  output.push(...formatList('Missing keys in FR dictionary:', parity.missingInFr));
  output.push(...formatList('Placeholder mismatch between FR/EN:', parity.placeholderMismatches));
  if (parity.missingInEn.length || parity.missingInFr.length || parity.placeholderMismatches.length) {
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

  console.log('i18n checks passed.');
}

main().catch((error) => {
  console.error('i18n checks failed with unexpected error.');
  console.error(error);
  process.exit(1);
});