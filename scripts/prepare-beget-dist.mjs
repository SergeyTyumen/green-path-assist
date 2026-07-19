import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const distDir = 'dist';
const backendDir = 'beget-backend';

if (!existsSync(distDir)) {
  throw new Error('Папка dist не найдена. Сначала выполните vite build.');
}

for (const entry of readdirSync(backendDir)) {
  const source = join(backendDir, entry);
  const target = join(distDir, entry);
  if (entry === 'README.md') continue;
  if (entry === 'config.php') continue;
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}

mkdirSync(join(distDir, 'uploads'), { recursive: true });

console.log('Beget bundle готов: загрузите содержимое папки dist в public_html.');