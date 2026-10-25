import './verify.mjs';
import { mkdirSync, copyFileSync } from 'node:fs';

mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'favicon.svg', '.nojekyll']) {
  copyFileSync(new URL(file, import.meta.url), new URL(`dist/${file}`, import.meta.url));
}
console.log('Built dist/ with only the public runtime files.');
