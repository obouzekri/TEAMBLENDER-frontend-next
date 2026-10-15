import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL('../lib/i18n/I18nProvider.js', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, allowJs: true, esModuleInterop: true },
  fileName: 'I18nProvider.jsx',
}).outputText;
const exports = {};
vm.runInNewContext(compiled, {
  exports,
  require: (name) => {
    if (name === 'next/navigation') {
      return { usePathname: () => '/fr/participant', useRouter: () => ({}) };
    }
    if (name === './routing') {
      return {
        detectLocaleFromPathname: () => 'fr',
        normalizeLocale: (locale) => locale === 'en' ? 'en' : 'fr',
      };
    }
    return require(name);
  },
});

const { I18nProvider, ChallengeLocaleProvider, useI18nContext } = exports;
function Probe({ change = false }) {
  const { locale, setLocale } = useI18nContext();
  if (change) setLocale('fr');
  return React.createElement('span', null, locale);
}
const scoped = (locale) => React.createElement(
  ChallengeLocaleProvider, { locale }, React.createElement(Probe, { change: true })
);
const html = renderToStaticMarkup(React.createElement(
  I18nProvider, null,
  React.createElement(Probe),
  scoped('en'),
  React.createElement(Probe),
  scoped('fr'),
  scoped(undefined)
));
assert.equal(html, '<span>fr</span><span>en</span><span>fr</span><span>fr</span><span>fr</span>');
assert.ok(!source.slice(source.indexOf('export function ChallengeLocaleProvider')).includes('localStorage'));
assert.ok(!source.slice(source.indexOf('export function ChallengeLocaleProvider')).includes('document.cookie'));

const builder = fs.readFileSync(new URL('../app/session-builder/SessionBuilder.js', import.meta.url), 'utf8');
assert.match(builder, /payload\.status = 'en_cours';\s+payload\.locale = locale;/);
assert.match(builder, /\[apiRequest, sessionId, locale\]/);
const persistence = builder.slice(builder.indexOf('const persistSelectionToBackend'), builder.indexOf('const restoreSelectedChallenges'));
assert.ok(persistence.indexOf('JSON.stringify({ config })') < persistence.indexOf('token, true'));
assert.doesNotMatch(persistence, /ParticipantLimitError/);
const launch = builder.slice(builder.indexOf('const handleLaunchSession'), builder.indexOf('const handleRequestLaunch'));
assert.doesNotMatch(launch, /ParticipantLimitError/);
const admin = fs.readFileSync(new URL('../app/admin/AdminClient.js', import.meta.url), 'utf8');
assert.match(admin, /editingSession\.status === 'en_cours' \? \{ locale \}/);
assert.match(admin, /newSession\.status === 'en_cours' \? \{ locale \}/);
const wrapper = fs.readFileSync(new URL('../components/Challenges/ChallengeWrapper.js', import.meta.url), 'utf8');
assert.match(wrapper, /'crossword_live_v1'/);
assert.equal((wrapper.match(/locale: payload\.context\?\.locale === 'en' \? 'en' : 'fr'/g) || []).length, 2);
assert.match(wrapper, /a\.locale === b\.locale/);
assert.match(wrapper, /a\.sessionConfigLocked === b\.sessionConfigLocked/);
assert.doesNotMatch(fs.readFileSync(new URL('../components/Challenges/CrosswordLive/CrosswordChallenge.js', import.meta.url), 'utf8'), /participantLimitError|crosswordParticipantValidation/);
console.log('TEST_SESSION_LOCALE_OK');
