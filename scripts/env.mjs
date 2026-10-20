import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const apiDir = path.join(repoRoot, 'apps', 'api');

export function loadEnvFile(file, { override = false } = {}) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (override || process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

export function loadLocalEnv() {
  loadEnvFile(path.join(repoRoot, '.env'));
  loadEnvFile(path.join(apiDir, '.env'), { override: true });
}

export function mvnwCommand() {
  return process.platform === 'win32' ? 'mvnw.cmd' : './mvnw';
}

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const isWinCmd = process.platform === 'win32' && /\.cmd$/i.test(command);
    const child = spawn(
      isWinCmd ? process.env.ComSpec || 'cmd.exe' : command,
      isWinCmd ? ['/d', '/s', '/c', command, ...args] : args,
      {
        stdio: 'inherit',
        shell: false,
        windowsHide: true,
        ...options,
        env: { ...process.env, ...(options.env ?? {}) },
      },
    );
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} saiu com código ${code}`));
    });
  });
}

export function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Defina ${name} no apps/api/.env (veja apps/api/.env.example).`);
  }
  return value;
}
