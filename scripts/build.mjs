import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
const types = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.type-tests.json'], { stdio: 'inherit' });
if (types.status !== 0) process.exit(types.status ?? 1);
await rm('site', { recursive: true, force: true });
const build = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const { build: bundle } = await import('esbuild');
await bundle({ entryPoints: ['src/app.tsx'], outfile: 'site/app.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, legalComments: 'linked', define: { 'process.env.NODE_ENV': '"production"' } });
// Component styles are authored beside their views and bundled for Pages.
await bundle({ entryPoints: ['src/styles.css'], outfile: 'assets/styles.css', bundle: true, minify: true, target: 'es2022' });
await import('./version-assets.mjs');
