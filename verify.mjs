import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
new Script(js);
assert.match(html, /<html lang="ar" dir="rtl">/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /<script src="\.\/app.js" defer>/);
assert.match(html, /id="clear-data"/);
assert.doesNotMatch(html, /fonts\.google/);
const data = JSON.parse(html.match(/<script type="application\/json" id="tpl-data">([\s\S]*?)<\/script>/)[1]);
assert(data.templates.length > 0);
const keys = new Set();
let fields = 0;
for (const template of data.templates) {
  assert(!keys.has(template.key), `Duplicate key: ${template.key}`);
  keys.add(template.key);
  assert.match(template.key, /^[a-z0-9-]+$/);
  const definitions = new Set(template.schema.variables.map(v => v.key));
  for (const [, key] of template.html.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
    assert(definitions.has(key), `${template.key}: missing definition for ${key}`);
  }
  assert.doesNotMatch(template.html, /<script\b|\son[a-z]+\s*=/i);
  assert.doesNotMatch(template.css, /@import|url\(\s*["']?https?:/i);
  assert.match(template.html, /class="page"/);
  fields += definitions.size;
}
assert.match(js, /el\.textContent = v/);
assert.match(js, /f\.size > 1024 \* 1024/);
assert.match(css, /prefers-reduced-motion/);
for (const [, path] of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)) {
  assert(readFileSync(new URL(path, import.meta.url)).length > 0, `Missing ${path}`);
}
console.log(`Verified ${keys.size} templates, ${fields} field definitions, local assets, JavaScript syntax, and static security contracts.`);
