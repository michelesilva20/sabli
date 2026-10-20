import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { apiDir, loadLocalEnv, mvnwCommand, requireEnv, run } from './env.mjs';

loadLocalEnv();

if (!existsSync(path.join(apiDir, '.env'))) {
  console.error('Copie apps/api/.env.example para apps/api/.env e preencha os segredos locais.');
  process.exit(1);
}

const jdbc = requireEnv('SABLI_DATASOURCE_URL');
requireEnv('SABLI_DATASOURCE_USERNAME');
requireEnv('SABLI_DATASOURCE_PASSWORD');
const secret = requireEnv('SABLI_JWT_SECRET');
if (secret.length < 32) {
  console.error('SABLI_JWT_SECRET precisa ter pelo menos 32 caracteres.');
  process.exit(1);
}

const java = spawnSync('java', ['-version'], { encoding: 'utf8' });
const banner = `${java.stderr || ''}${java.stdout || ''}`;
if (!banner.includes('version "25')) {
  console.error('Use JDK 25 LTS no PATH ou em JAVA_HOME. java -version atual:');
  process.stderr.write(banner || '(java não encontrado)\n');
  process.exit(1);
}

const jar = path.join(apiDir, 'target', 'sabli-api-0.1.0-SNAPSHOT.jar');
if (!existsSync(jar)) {
  console.log('Empacotando a API com o Maven Wrapper...');
  await run(mvnwCommand(), ['-q', '-DskipTests', 'package'], { cwd: apiDir });
}

if (process.env.SPRING_DATASOURCE_URL) {
  console.log(`Ignorando SPRING_DATASOURCE_URL herdado (${process.env.SPRING_DATASOURCE_URL}).`);
  delete process.env.SPRING_DATASOURCE_URL;
  delete process.env.SPRING_DATASOURCE_USERNAME;
  delete process.env.SPRING_DATASOURCE_PASSWORD;
}

const jdbcUrl = jdbc.includes('?') ? `${jdbc}&sslmode=disable` : `${jdbc}?sslmode=disable`;
console.log(`API local: perfil local, ${jdbcUrl}.`);
await run(
  'java',
  [
    '-Djava.net.preferIPv4Stack=true',
    '-Dspring.profiles.active=local',
    `-Dspring.datasource.url=${jdbcUrl}`,
    `-Dspring.datasource.username=${requireEnv('SABLI_DATASOURCE_USERNAME')}`,
    `-Dspring.datasource.password=${requireEnv('SABLI_DATASOURCE_PASSWORD')}`,
    '-jar',
    jar,
  ],
  { cwd: apiDir },
);
