// Entrypoint for AtolWing: Archipelago Sortie (make.fun best-flight-game-20261126-0057).
// Copies static offline game/ and screenshots/ into MAKEFUN_OUTPUT_DIR (or /output)
// and emits a byte-deterministic dossier.json via vendor/makefun-game.ts.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const targetGameDir = join(outDir, 'game');
const targetShotsDir = join(outDir, 'screenshots');

mkdirSync(outDir, { recursive: true });
if (existsSync(targetGameDir)) rmSync(targetGameDir, { recursive: true, force: true });
if (existsSync(targetShotsDir)) rmSync(targetShotsDir, { recursive: true, force: true });

cpSync(join(rootDir, 'game'), targetGameDir, { recursive: true });
mkdirSync(targetShotsDir, { recursive: true });
if (existsSync(join(rootDir, 'screenshots'))) {
  cpSync(join(rootDir, 'screenshots'), targetShotsDir, { recursive: true });
}

const MAX_DOSSIER_BYTES = 1572864; // 1.5 MiB competition cap

const dossierBytes = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

if (dossierBytes.byteLength > MAX_DOSSIER_BYTES) {
  throw new Error(`dossier.json (${dossierBytes.byteLength} bytes) exceeds 1.5 MiB limit`);
}

writeFileSync(join(outDir, 'dossier.json'), dossierBytes);
