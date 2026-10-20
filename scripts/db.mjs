import { existsSync } from 'node:fs';
import path from 'node:path';
import { apiDir, repoRoot, run } from './env.mjs';

const action = process.argv[2] === 'down' ? 'down' : 'up';
const envFile = path.join(apiDir, '.env');
const args = ['compose'];
if (existsSync(envFile)) {
  args.push('--env-file', envFile);
}
if (action === 'up') args.push('up', '-d', '--wait');
else args.push('down');

await run('docker', args, { cwd: repoRoot, env: process.env });
