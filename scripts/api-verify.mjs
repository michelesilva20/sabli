import { spawnSync } from 'node:child_process';
import { apiDir, mvnwCommand, run } from './env.mjs';

const java = spawnSync('java', ['-version'], { encoding: 'utf8' });
const banner = `${java.stderr || ''}${java.stdout || ''}`;
if (!banner.includes('version "25')) {
  console.error('Use JDK 25 LTS no PATH ou em JAVA_HOME para os testes da API.');
  process.stderr.write(banner || '(java não encontrado)\n');
  process.exit(1);
}

await run(mvnwCommand(), ['-B', 'verify'], { cwd: apiDir, env: process.env });
