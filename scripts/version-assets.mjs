import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => entry.isDirectory() ? walk(`${directory}/${entry.name}`) : `${directory}/${entry.name}`));
  return files.flat();
}
const paths = ['index.html', ...await walk('site'), ...await walk('assets')].sort();
const files = new Map(await Promise.all(paths.map(async path => [path, await readFile(path)])));
const source = new Map();
const hash = createHash('sha256');
for (const [path, bytes] of files) {
  if (/\.(?:html|js|css)$/.test(path)) {
    const content = bytes.toString('utf8').replace(/\?v=[\w-]+/g, '');
    source.set(path, content);
    hash.update(path).update('\0').update(content).update('\0');
  } else {
    // Images, fonts and recordings are hashed as bytes and never rewritten.
    hash.update(path).update('\0').update(bytes).update('\0');
  }
}
const revision = hash.digest('hex').slice(0, 12);
let stale = false;
for (const [path, content] of source) {
  const next = content.replace(/(["'])(\.\.?\/[^"']+\.(?:js|css))\1/g, (_, quote, url) => `${quote}${url}?v=${revision}${quote}`);
  if (next === await readFile(path, 'utf8')) continue;
  stale = true;
  if (!process.argv.includes('--check')) await writeFile(path, next);
}
if (process.argv.includes('--check') && stale) {
  console.error('Asset revisions are stale. Run npm run build.'); process.exitCode = 1;
} else console.log(`Asset revision: ${revision}`);
