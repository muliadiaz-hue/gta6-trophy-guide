// Leonida Platinum — the hand-in program for the GTA 6 trophy guide.
// Node 22+, standard library only. It takes the guide in app/ (plain static
// files: index.html, ES modules, one stylesheet, data/trophies.json) and the
// four screenshots in screenshots/, lays them out in /output (or
// $MAKEFUN_OUTPUT_DIR outside the grader), then writes dossier.json with
// the kit's vendored library — the summary the judge reads. The library
// file vendor/makefun-frontend.ts is the kit's own copy and must stay
// byte-for-byte as shipped: dossier.json has to match what the scorer's
// copy of that library writes.
//
// Run it:  MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve it: node serve.ts, then open http://localhost:8080
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from an empty output directory so a stale file from an earlier run
// can never ride along into the hand-in.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// Caps from the competition's gate (reference/gate.json): text_max_bytes
// shapes the dossier's text; the rest refuse an entry the scorer would
// refuse — at most 4 screenshots, each at most 256 KiB; app/ at most 993
// entries and 48 MiB of files.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Sanity-check the hand-in before reporting it: dossier.json must parse,
// the guide must be present, and at least the cover screenshot must exist.
const parsed = JSON.parse(readFileSync(join(outDir, 'dossier.json'), 'utf8'));
if (!parsed || typeof parsed !== 'object') throw new Error('dossier.json did not parse');
if (!existsSync(join(outDir, 'app', 'index.html'))) throw new Error('app/index.html missing from hand-in');
const shots = readdirSync(join(outDir, 'screenshots')).filter((f) => /\.(png|jpe?g)$/i.test(f));
if (shots.length === 0) throw new Error('no screenshots in hand-in');
const appBytes = statSync(join(outDir, 'app', 'data', 'trophies.json')).size;
console.log(`hand-in written to ${outDir} (${shots.length} screenshots, trophies.json ${appBytes} bytes)`);
