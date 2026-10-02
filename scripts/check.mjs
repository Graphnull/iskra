import { readdir, readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const build = spawnSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = await Promise.all(entries.map(entry => entry.isDirectory() ? walk(`${directory}/${entry.name}`) : `${directory}/${entry.name}`));
  return children.flat();
}
const modules = (await Promise.all(['site', 'tests', 'scripts'].map(walk))).flat().filter(path => /\.(mjs|js)$/.test(path));
let failed = false;
for (const path of modules) {
  const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (result.status !== 0) { console.error(result.stderr); failed = true; }
  const source = await readFile(path, 'utf8');
  // Includes the dynamic-import mode registry, as well as static imports.
  for (const match of source.matchAll(/["'](\.\.?\/[^"']+\.(?:mjs|js))(?:\?[^"']*)?["']/g)) {
    try { await access(resolve(dirname(path), match[1])); }
    catch { console.error(`${path}: missing module ${match[1]}`); failed = true; }
  }
}
const html = await readFile('index.html', 'utf8');
for (const match of html.matchAll(/(?:src|href)="(\.\/[^"]+\.(?:mjs|js|css))(?:\?[^"]*)?"/g)) {
  try { await access(match[1]); } catch { console.error(`index.html: missing asset ${match[1]}`); failed = true; }
}
for (const args of [['scripts/version-assets.mjs', '--check'], ['--test', ...modules.filter(path => path.startsWith('tests/') && path.endsWith('.test.mjs'))]]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
