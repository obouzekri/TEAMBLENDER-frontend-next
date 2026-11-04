// Outil de migration (phase 0 de l'arabe) : remplace `isEn ? 'EN' : 'FR'` par `t('zone.cle')`
// et range les deux textes dans lib/i18n/dictionaries/<langue>/<zone>.js.
//
//   node scripts/i18n-codemod.mjs <zone> <fichier...> [--dry]
//
// Une conversion n'est faite que si elle est prouvée équivalente : la langue testée doit être
// résolue jusqu'à sa variable, et `t` n'est utilisé que s'il vient du même useI18n().
// Sinon : translate(<langue testée>, cle). Les cas non prouvés sont listés, à traiter à la main.
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as espree from 'espree';
import * as eslintScope from 'eslint-scope';
import { KEYS } from 'eslint-visitor-keys';
import MagicString from 'magic-string';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DICT_DIR = path.join(rootDir, 'lib', 'i18n', 'dictionaries');
const LOCALES = ['fr', 'en'];
const CODE_LIKE = /^(?:[a-z]{2}(?:-[A-Z]{2})?|[a-z]{2}_[A-Z]{2})$/;

const [zone, ...rest] = process.argv.slice(2);
const dryRun = rest.includes('--dry');
const files = rest.filter((arg) => !arg.startsWith('--'));
if (!/^[a-z][A-Za-z0-9]*$/.test(String(zone)) || !files.length) {
  console.error('Usage: node scripts/i18n-codemod.mjs <zone camelCase> <file...> [--dry]');
  process.exit(1);
}

// ---------- dictionnaires de zone ----------

async function loadZone(locale) {
  const file = path.join(DICT_DIR, locale, `${zone}.js`);
  try {
    const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
    return { ...mod.default };
  } catch {
    return {};
  }
}

function quote(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
}

async function writeZone(locale, entries) {
  const body = Object.entries(entries).map(([key, value]) => `  ${key}: ${quote(value)},`).join('\n');
  await fs.mkdir(path.join(DICT_DIR, locale), { recursive: true });
  await fs.writeFile(path.join(DICT_DIR, locale, `${zone}.js`), `const ${zone} = {\n${body}\n};\n\nexport default ${zone};\n`);

  const mainFile = path.join(DICT_DIR, `${locale}.js`);
  const raw = await fs.readFile(mainFile, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let main = raw.replace(/\r\n/g, '\n');
  const importLine = `import ${zone} from './${locale}/${zone}.js';`;
  if (!main.includes(importLine)) {
    const firstImport = main.indexOf('import ');
    main = firstImport === 0 ? `${importLine}\n${main}` : `${importLine}\n\n${main}`;
    const closing = `\n};\n\nexport default ${locale};`;
    if (!main.includes(closing)) throw new Error(`Unexpected end of ${mainFile}`);
    main = main.replace(closing, `\n  ${zone},${closing}`);
    await fs.writeFile(mainFile, main.replace(/\n/g, eol));
  }
}

// ---------- analyse ----------

function parse(code) {
  return espree.parse(code, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true }, range: true, loc: true });
}

function walk(node, visit, ancestors = []) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, ancestors);
  const keys = KEYS[node.type] || [];
  for (const key of keys) {
    const child = node[key];
    if (Array.isArray(child)) child.forEach((entry) => walk(entry, visit, [...ancestors, node]));
    else walk(child, visit, [...ancestors, node]);
  }
}

function scopeAt(scopeManager, ancestors, node) {
  for (const candidate of [node, ...[...ancestors].reverse()]) {
    const scope = scopeManager.acquire(candidate, true);
    if (scope) return scope;
  }
  return scopeManager.globalScope;
}

function resolve(scope, name) {
  for (let current = scope; current; current = current.upper) {
    const variable = current.set.get(name);
    if (variable) return variable;
  }
  return null;
}

const isLocaleLiteral = (node) => node?.type === 'Literal' && (node.value === 'en' || node.value === 'fr');

// Renvoie { localeNode, enFirst } si le test compare une langue à 'en' / 'fr', sinon null.
function readComparison(test) {
  if (test?.type !== 'BinaryExpression' || !['===', '==', '!==', '!='].includes(test.operator)) return null;
  const [other, literal] = isLocaleLiteral(test.right) ? [test.left, test.right] : isLocaleLiteral(test.left) ? [test.right, test.left] : [];
  if (!literal || isLocaleLiteral(other)) return null;
  const equal = test.operator === '===' || test.operator === '==';
  return { localeNode: other, enFirst: (literal.value === 'en') === equal };
}

function readTest(test, scope) {
  let negate = false;
  let node = test;
  while (node.type === 'UnaryExpression' && node.operator === '!') {
    negate = !negate;
    node = node.argument;
  }
  let result = readComparison(node);
  if (!result && node.type === 'Identifier' && /^is(En|Fr)$/.test(node.name)) {
    const variable = resolve(scope, node.name);
    const def = variable?.defs[0];
    if (def?.type === 'Variable' && def.node.id.type === 'Identifier' && def.parent.kind === 'const') {
      result = readComparison(def.node.init);
    }
  }
  if (!result) return null;
  return { ...result, enFirst: negate ? !result.enFirst : result.enFirst };
}

// Un texte contenant déjà « {mot} » serait pris pour une variable par t() : non converti.
const PLACEHOLDER_LIKE = /\{\w+\}/;

function stringParts(node, code) {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return PLACEHOLDER_LIKE.test(node.value) ? null : { text: node.value, params: [] };
  }
  if (node.type !== 'TemplateLiteral') return null;
  let text = '';
  const params = [];
  node.quasis.forEach((quasi, index) => {
    if (quasi.value.cooked == null || PLACEHOLDER_LIKE.test(quasi.value.cooked)) throw new Error('unsupported template');
    text += quasi.value.cooked;
    const expression = node.expressions[index];
    if (expression) {
      const source = code.slice(...expression.range);
      params.push({ source, expression });
      text += `\u0000${source}\u0000`;
    }
  });
  return { text, params };
}

function paramName(expression) {
  if (expression.type === 'Identifier') return expression.name;
  if (expression.type === 'MemberExpression' && !expression.computed) return expression.property.name;
  if (expression.type === 'CallExpression') {
    const callee = expression.callee.type === 'Identifier' ? expression.callee.name : expression.callee.property?.name;
    const match = /^(?:format|get|to)([A-Z]\w*)$/.exec(callee || '');
    if (match) return match[1][0].toLowerCase() + match[1].slice(1);
    if (expression.arguments[0]) return paramName(expression.arguments[0]);
  }
  if (expression.type === 'ChainExpression') return paramName(expression.expression);
  if (expression.type === 'LogicalExpression' || expression.type === 'BinaryExpression') return paramName(expression.left);
  return 'value';
}

function keyFromText(text) {
  const words = text.replace(/\u0000[^\u0000]*\u0000/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .match(/[A-Za-z0-9]+/g) || [];
  const key = words.slice(0, 6).map((word, index) => {
    const lower = word.toLowerCase();
    return index === 0 ? lower : lower[0].toUpperCase() + lower.slice(1);
  }).join('');
  const safe = /^[0-9]/.test(key) ? `n${key}` : key;
  return safe || 'text';
}

// ---------- transformation ----------

function analyze(ast) {
  return eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module', childVisitorKeys: KEYS, fallback: 'iteration' });
}

// Helpers `function label(value, isEn)` : si chaque appel du fichier passe un `isEn` local
// (const isEn = X === 'en'), le paramètre devient `locale` et les appels passent X.
function rewriteLocaleFlagParams(code, file, skipped) {
  const ast = parse(code);
  const scopeManager = analyze(ast);
  const out = new MagicString(code);
  const exported = new Set(ast.body
    .filter((statement) => statement.type === 'ExportNamedDeclaration' && statement.declaration?.id)
    .map((statement) => statement.declaration.id.name));

  for (const scope of scopeManager.scopes) {
    if (scope.type !== 'function' || scope.block.type !== 'FunctionDeclaration') continue;
    const fn = scope.block;
    // `isEn` ou `isEn = false`.
    const flagName = (param) => (param.type === 'AssignmentPattern' ? param.left : param);
    const index = fn.params.findIndex((param) => flagName(param).type === 'Identifier' && /^is(En|Fr)$/.test(flagName(param).name));
    if (index < 0) continue;
    const flag = flagName(fn.params[index]).name;
    const line = fn.loc.start.line;
    if (exported.has(fn.id.name)) {
      skipped.push(`${file}:${line} ${fn.id.name}(…, ${flag}) is exported`);
      continue;
    }
    if (scope.set.has('locale') || scope.through.some((ref) => ref.identifier.name === 'locale')) {
      skipped.push(`${file}:${line} ${fn.id.name}(…, ${flag}) already sees a \`locale\``);
      continue;
    }
    const fnVariable = resolve(scope.upper, fn.id.name);
    const calls = fnVariable.references.map((ref) => ({ ref, parentCall: findCall(ast, ref.identifier) }));
    const replacements = [];
    let ok = calls.length > 0;
    for (const { ref, parentCall } of calls) {
      const arg = parentCall?.arguments[index];
      // Argument déjà écrit `(locale === 'en')` (prop convertie au passage précédent).
      const direct = readComparison(arg);
      if (direct && direct.enFirst === (flag === 'isEn') && direct.localeNode.type === 'Identifier') {
        replacements.push([arg, direct.localeNode.name]);
        continue;
      }
      const argVariable = arg?.type === 'Identifier' && arg.name === flag ? resolve(ref.from, flag) : null;
      const def = argVariable?.defs[0];
      const comparison = def?.type === 'Variable' && def.parent.kind === 'const' ? readComparison(def.node.init) : null;
      const sameEnFirst = comparison && comparison.enFirst === (flag === 'isEn');
      const localeNode = comparison?.localeNode;
      const localeVariable = localeNode?.type === 'Identifier' ? resolve(ref.from, localeNode.name) : null;
      if (!sameEnFirst || !localeVariable || localeVariable !== resolve(argVariable.scope, localeNode.name)) {
        ok = false;
        break;
      }
      replacements.push([arg, localeNode.name]);
    }
    if (!ok) {
      skipped.push(`${file}:${line} ${fn.id.name}(…, ${flag}) has a call that does not pass a local locale flag`);
      continue;
    }
    for (const [arg, name] of replacements) {
      let [start, end] = arg.range;
      // `(locale === 'en')` en argument : retirer aussi les parenthèses.
      if (code[start - 1] === '(' && code[end] === ')' && /[,(]$/.test(code.slice(0, start - 1).trimEnd())) {
        start -= 1;
        end += 1;
      }
      out.overwrite(start, end, name);
    }
    const param = fn.params[index];
    out.overwrite(...param.range, 'locale');
    const variable = scope.set.get(flag);
    for (const ref of variable.references) {
      if (ref.identifier.range[0] >= param.range[0] && ref.identifier.range[1] <= param.range[1]) continue;
      out.overwrite(...ref.identifier.range, flag === 'isEn' ? "(locale === 'en')" : "(locale === 'fr')");
    }
  }
  return out.toString();
}

const flagTest = (flag) => (flag === 'isEn' ? "(locale === 'en')" : "(locale === 'fr')");

// Props de composants : `{ isEn = false }` devient `{ locale }` et `isEn={isEn}` devient `locale={locale}`.
// Les composants qui reçoivent la prop doivent être migrés dans le même lancement (vérifié par lint:i18n).
function rewriteLocaleFlagProps(code, file, skipped) {
  const ast = parse(code);
  const scopeManager = analyze(ast);
  const out = new MagicString(code);
  const parents = new Map();
  walk(ast, (node, ancestors) => parents.set(node, ancestors.at(-1)));
  const done = new Set();

  const jsxFlagAttribute = (identifier) => {
    const container = parents.get(identifier);
    const attribute = container?.type === 'JSXExpressionContainer' ? parents.get(container) : null;
    return attribute?.type === 'JSXAttribute' && /^is(En|Fr)$/.test(attribute.name.name) ? attribute : null;
  };

  // 1. Composants qui reçoivent isEn / isFr en prop déstructurée.
  for (const scope of scopeManager.scopes) {
    if (scope.type !== 'function') continue;
    for (const param of scope.block.params) {
      if (param.type !== 'ObjectPattern') continue;
      for (const property of param.properties) {
        if (property.type !== 'Property' || property.key.type !== 'Identifier' || !/^is(En|Fr)$/.test(property.key.name)) continue;
        const flag = property.key.name;
        const local = property.value.type === 'AssignmentPattern' ? property.value.left : property.value;
        if (local.type !== 'Identifier' || local.name !== flag) continue;
        const line = property.loc.start.line;
        if (scope.set.has('locale') || scope.through.some((ref) => ref.identifier.name === 'locale')) {
          skipped.push(`${file}:${line} prop ${flag} next to an existing \`locale\``);
          continue;
        }
        if (flag === 'isFr') {
          skipped.push(`${file}:${line} prop isFr (convert by hand)`);
          continue;
        }
        out.overwrite(...property.range, 'locale');
        for (const ref of scope.set.get(flag).references) {
          if (ref.identifier.range[0] >= property.range[0] && ref.identifier.range[1] <= property.range[1]) continue;
          const attribute = jsxFlagAttribute(ref.identifier);
          if (attribute && attribute.name.name === flag) {
            out.overwrite(...attribute.range, 'locale={locale}');
            done.add(attribute);
          } else if (parents.get(ref.identifier)?.type === 'Property' && parents.get(ref.identifier).shorthand) {
            out.overwrite(...parents.get(ref.identifier).range, 'locale');
          } else {
            out.overwrite(...ref.identifier.range, flagTest(flag));
          }
        }
      }
    }
  }

  // 2. Parents qui passent `isEn={isEn}` avec `const isEn = locale === 'en'`.
  walk(ast, (node) => {
    if (node.type !== 'JSXAttribute' || done.has(node) || node.name.name !== 'isEn') return;
    const expression = node.value?.type === 'JSXExpressionContainer' ? node.value.expression : null;
    if (expression?.type !== 'Identifier') return;
    const reference = scopeManager.scopes.flatMap((entry) => entry.references).find((ref) => ref.identifier === expression);
    const def = reference?.resolved?.defs[0];
    const comparison = def?.type === 'Variable' && def.parent.kind === 'const' ? readComparison(def.node.init) : null;
    if (!comparison?.enFirst || comparison.localeNode.type !== 'Identifier') {
      skipped.push(`${file}:${node.loc.start.line} isEn={${expression.name}} is not a local locale flag`);
      return;
    }
    out.overwrite(...node.range, `locale={${comparison.localeNode.name}}`);
  });

  return out.toString();
}

function findCall(ast, identifier) {
  let found = null;
  walk(ast, (node) => {
    if (!found && node.type === 'CallExpression' && node.callee === identifier) found = node;
  });
  return found;
}

async function migrate(file, dictionaries) {
  const absolute = path.resolve(rootDir, file);
  const original = await fs.readFile(absolute, 'utf8');
  const skipped = [];
  const code = rewriteLocaleFlagProps(rewriteLocaleFlagParams(original, file, skipped), file, skipped);
  const ast = parse(code);
  const scopeManager = analyze(ast);
  const out = new MagicString(code);
  const declaratorsNeedingT = new Set();
  let usesTranslate = false;
  let converted = 0;
  const pairToKey = new Map(Object.keys(dictionaries.en).map((key) => [`${dictionaries.en[key]}\u0001${dictionaries.fr[key]}`, key]));

  const conditionals = [];
  walk(ast, (node, ancestors) => {
    if (node.type === 'ConditionalExpression') conditionals.push({ node, ancestors });
  });

  for (const { node, ancestors } of conditionals) {
    const line = node.loc.start.line;
    const scope = scopeAt(scopeManager, ancestors, node);
    const test = readTest(node.test, scope);
    if (!test) {
      const flag = /\bis(?:En|Fr)\b/.exec(code.slice(...node.test.range));
      if (flag) skipped.push(`${file}:${line} ${flag[0]} is not a local const (parameter?)`);
      continue;
    }

    // Une conversion englobant une autre est reportée au passage suivant.
    if (conditionals.some((other) => other.node !== node && other.node.range[0] >= node.range[0] && other.node.range[1] <= node.range[1]
      && readTest(other.node.test, scopeAt(scopeManager, other.ancestors, other.node)))) {
      skipped.push(`${file}:${line} nested (rerun)`);
      continue;
    }

    const [enNode, frNode] = test.enFirst ? [node.consequent, node.alternate] : [node.alternate, node.consequent];
    let en;
    let fr;
    try {
      en = stringParts(enNode, code);
      fr = stringParts(frNode, code);
    } catch {
      en = null;
    }
    if (!en || !fr) {
      skipped.push(`${file}:${line} non-string branch`);
      continue;
    }
    if (!en.params.length && !fr.params.length && CODE_LIKE.test(en.text) && CODE_LIKE.test(fr.text)) {
      skipped.push(`${file}:${line} locale code, not text`);
      continue;
    }

    // Variables {nom} partagées entre les deux langues.
    const names = new Map();
    const used = new Set();
    for (const { source, expression } of [...en.params, ...fr.params]) {
      if (names.has(source)) continue;
      let name = paramName(expression);
      for (let index = 2; used.has(name); index += 1) name = `${paramName(expression)}${index}`;
      used.add(name);
      names.set(source, name);
    }
    const toTemplate = (parts) => parts.text.replace(/\u0000([^\u0000]*)\u0000/g, (_, source) => `{${names.get(source)}}`);
    const enText = toTemplate(en);
    const frText = toTemplate(fr);

    // Quel traducteur ? La langue testée doit être une variable résolue au même endroit.
    const { localeNode } = test;
    const localeVariable = localeNode.type === 'Identifier' ? resolve(scope, localeNode.name) : null;
    if (localeNode.type !== 'Identifier' || !localeVariable) {
      skipped.push(`${file}:${line} locale not resolvable here (${code.slice(...localeNode.range)})`);
      continue;
    }
    const localeDeclarator = localeVariable.defs[0]?.type === 'Variable' ? localeVariable.defs[0].node : null;
    const fromUseI18n = localeDeclarator?.init?.type === 'CallExpression' && localeDeclarator.init.callee.name === 'useI18n'
      && localeDeclarator.id.type === 'ObjectPattern';
    const tVariable = resolve(scope, 't');
    let call;
    if (fromUseI18n && tVariable && tVariable.defs[0]?.node === localeDeclarator) {
      call = 't';
    } else if (fromUseI18n && !tVariable) {
      declaratorsNeedingT.add(localeDeclarator);
      call = 't';
    } else {
      usesTranslate = true;
      call = `translate(${localeNode.name}, `;
    }

    let key = pairToKey.get(`${enText}\u0001${frText}`);
    if (!key) {
      const base = keyFromText(enText);
      key = base;
      for (let index = 2; key in dictionaries.en; index += 1) key = `${base}${index}`;
      dictionaries.en[key] = enText;
      dictionaries.fr[key] = frText;
      pairToKey.set(`${enText}\u0001${frText}`, key);
    }

    const params = [...names.entries()].map(([source, name]) => (source === name ? name : `${name}: ${source}`));
    const args = `'${zone}.${key}'${params.length ? `, { ${params.join(', ')} }` : ''}`;
    // `(isEn ? a : b)` → `t(…)` sans parenthèses de groupement devenues inutiles.
    let [start, end] = node.range;
    const before = code.slice(0, start - 1).trimEnd().at(-1);
    if (code[start - 1] === '(' && code[end] === ')' && before && !/[\w$)\]]/.test(before)) {
      start -= 1;
      end += 1;
    }
    out.overwrite(start, end, call === 't' ? `t(${args})` : `${call}${args})`);
    converted += 1;
  }

  for (const declarator of declaratorsNeedingT) {
    const last = declarator.id.properties.at(-1);
    out.appendLeft(last.range[1], ', t');
  }

  if (usesTranslate && !/\btranslate\b[^;]*from '@\/lib\/i18n'/.test(code)) {
    const existing = /import \{([^}]*)\} from '@\/lib\/i18n';/.exec(code);
    if (existing) {
      out.overwrite(existing.index, existing.index + existing[0].length, `import {${existing[1].replace(/\s*$/, '')}, translate } from '@/lib/i18n';`);
    } else {
      const imports = ast.body.filter((statement) => statement.type === 'ImportDeclaration');
      // Après le dernier import, sinon après une directive "use client" (qui doit rester en tête).
      const directive = ast.body.find((statement) => statement.type === 'ExpressionStatement' && statement.directive);
      const anchor = imports.at(-1) || directive;
      if (anchor) out.appendRight(anchor.range[1], "\nimport { translate } from '@/lib/i18n';");
      else out.prepend("import { translate } from '@/lib/i18n';\n");
    }
  }

  let result = out.toString();
  result = removeUnusedLocaleFlags(result);
  return { converted, skipped, write: result !== original ? () => fs.writeFile(absolute, result) : null };
}

const HOOKS_WITH_DEPS = new Set(['useMemo', 'useCallback', 'useEffect', 'useLayoutEffect']);

// Dans les tableaux de dépendances des hooks, `isEn` devient la langue dont il dépend ;
// puis `const isEn = locale === 'en';` est supprimé quand plus rien ne le lit.
function removeUnusedLocaleFlags(code) {
  const ast = parse(code);
  const depsArrays = [];
  walk(ast, (node) => {
    if (node.type === 'CallExpression' && HOOKS_WITH_DEPS.has(node.callee.name) && node.arguments[1]?.type === 'ArrayExpression') {
      depsArrays.push(node.arguments[1]);
    }
  });
  const scopeManager = analyze(ast);
  const out = new MagicString(code);
  for (const scope of scopeManager.scopes) {
    for (const variable of scope.variables) {
      if (!/^is(En|Fr)$/.test(variable.name)) continue;
      const def = variable.defs[0];
      if (def?.type !== 'Variable' || def.parent.declarations.length !== 1) continue;
      const comparison = readComparison(def.node.init);
      if (!comparison || comparison.localeNode.type !== 'Identifier') continue;
      const localeName = comparison.localeNode.name;
      const otherReads = variable.references.filter((ref) => {
        const deps = depsArrays.find((array) => array.elements.includes(ref.identifier));
        if (!deps) return ref.isRead();
        const alreadyListed = deps.elements.some((element) => element?.type === 'Identifier' && element.name === localeName);
        if (alreadyListed) {
          const index = deps.elements.indexOf(ref.identifier);
          const next = deps.elements[index + 1];
          const previous = deps.elements[index - 1];
          if (next) out.remove(ref.identifier.range[0], next.range[0]);
          else if (previous) out.remove(previous.range[1], ref.identifier.range[1]);
          else out.remove(...ref.identifier.range);
        } else {
          out.overwrite(...ref.identifier.range, localeName);
        }
        return false;
      });
      if (otherReads.length) continue;
      let [start, end] = def.parent.range;
      while (start > 0 && (code[start - 1] === ' ' || code[start - 1] === '\t')) start -= 1;
      if (code[end] === '\r') end += 1;
      if (code[end] === '\n') end += 1;
      out.remove(start, end);
    }
  }
  return out.toString();
}

for (const locale of LOCALES) {
  const main = await fs.readFile(path.join(DICT_DIR, `${locale}.js`), 'utf8');
  if (new RegExp(`^  ${zone}: `, 'm').test(main)) {
    console.error(`Zone "${zone}" already exists as a hand-written section of ${locale}.js: pick another name.`);
    process.exit(1);
  }
}

const dictionaries = Object.fromEntries(await Promise.all(LOCALES.map(async (locale) => [locale, await loadZone(locale)])));
let total = 0;
const allSkipped = [];
const writes = [];
for (const file of files) {
  const { converted, skipped, write } = await migrate(file, dictionaries);
  total += converted;
  allSkipped.push(...skipped);
  if (write) writes.push(write);
  console.log(`${file}: ${converted} converted, ${skipped.length} skipped`);
}
// Dictionnaires d'abord : un fichier source n'est jamais réécrit vers des clés absentes.
if (!dryRun && total) {
  for (const locale of LOCALES) await writeZone(locale, dictionaries[locale]);
}
if (!dryRun) await Promise.all(writes.map((write) => write()));
if (allSkipped.length) console.log(['Skipped:', ...allSkipped.map((entry) => `  ${entry}`)].join('\n'));
console.log(`${dryRun ? '[dry] ' : ''}${total} converted into zone "${zone}".`);
