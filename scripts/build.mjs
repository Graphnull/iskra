import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
const types = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.type-tests.json'], { stdio: 'inherit' });
if (types.status !== 0) process.exit(types.status ?? 1);
await rm('site', { recursive: true, force: true });
const build = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
await import('./version-assets.mjs');
