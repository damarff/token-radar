// Token Radar's program: one sealed snapshot in, one ranked board and dashboard out.
//
// Usage (from this repo's root):
//   node --experimental-strip-types main.ts --input <snapshot.json> --out <out-dir>
//
// The build refuses to finish unless the board passes the gate: it must carry at least 100 rows,
// cover every slug the snapshot's watchlist names, rank 1..n with implied values that never rise
// with rank, and give every row a farm plan of 3..12 steps of 20..600 characters. Then the program
// writes board.json and data.js, copies the dashboard and the screenshots into the output dir, and
// writes dossier.json last with the vendored make.fun library: the scorer rebuilds the dossier from
// the output dir and compares bytes, so the dossier is written only once the dashboard and the
// screenshots are already in place.
//
// Nothing here is read from anywhere but the snapshot and the repo's own files. Nothing is written
// outside --out. Running it twice with the same inputs produces byte-identical outputs.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSnapshot, buildRadar, boardIssue, dataScript, MODEL_VERSION } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

/** The scorer's own caps (reference/gate.json): the text cap shapes the bytes, the rest refuse. */
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };

/** The program's exit codes: 0 = the board is built, anything else = it is not. */
const EXIT_USAGE = 2;
const EXIT_INPUT = 3;
const EXIT_GATE = 4;

const ROOT = dirname(fileURLToPath(import.meta.url));

/** The command line's options. */
interface Options {
  input: string;
  out: string;
}

/** The options, refused with a usage line instead of guessing defaults. */
function parseArgs(argv: string[]): Options {
  const o: Options = { input: '', out: '' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') o.input = argv[++i]!;
    else if (argv[i] === '--out') o.out = argv[++i]!;
  }
  if (!o.input || !o.out) {
    console.error('usage: node --experimental-strip-types main.ts --input <snapshot.json> --out <out-dir>');
    process.exit(EXIT_USAGE);
  }
  return o;
}

/** The files under a directory, relative, deepest-first, in a fixed order. */
function tree(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...tree(p, base));
    else out.push(p.slice(base.length + 1));
  }
  return out.sort();
}

function main(): void {
  const { input, out } = parseArgs(process.argv.slice(2));
  const inPath = resolve(input);
  const outDir = resolve(out);

  if (!existsSync(inPath)) {
    console.error(`input ${inPath} does not exist`);
    process.exit(EXIT_INPUT);
  }

  const text = readFileSync(inPath, 'utf8');
  const snapshot = parseSnapshot(text);

  // The board, the dashboard's data and the model that produced both.
  const { board, radar } = buildRadar(snapshot);
  const issue = boardIssue(board, snapshot);
  if (issue !== null) {
    console.error(`gate: ${issue}`);
    process.exit(EXIT_GATE);
  }
  if (board.length < 100) {
    console.error(`gate: the board has ${board.length} rows, fewer than 100`);
    process.exit(EXIT_GATE);
  }

  // The output dir is rebuilt, never patched: a stale file from an earlier run must never survive.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, 'board.json'), `${JSON.stringify(board, null, 2)}\n`, 'utf8');
  writeFileSync(join(outDir, 'data.js'), dataScript(radar), 'utf8');

  const dashSrc = join(ROOT, 'dashboard');
  const dashOut = join(outDir, 'dashboard');
  mkdirSync(dashOut, { recursive: true });
  for (const f of tree(dashSrc)) copyFileSync(join(dashSrc, f), join(dashOut, f));

  const shotSrc = join(ROOT, 'screenshots');
  const shotOut = join(outDir, 'screenshots');
  mkdirSync(shotOut, { recursive: true });
  if (existsSync(shotSrc)) {
    for (const f of tree(shotSrc)) copyFileSync(join(shotSrc, f), join(shotOut, f));
  }

  const dossier = buildDossier(outDir, {
    text_max_bytes: TEXT_MAX_BYTES,
    screenshots: SCREENSHOT_CAPS,
    dashboard: { max_files: 400, max_bytes: 4_194_304 },
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  const total = board.reduce((n, r) => n + r.implied_value_usd, 0);
  console.log(`board: ${board.length} rows (watchlist ${snapshot.watchlist.length}, early ${radar.early_size}), total implied $${(total / 1e9).toFixed(2)}B`);
  console.log(`top: ${board[0]!.name} $${board[0]!.implied_value_usd.toLocaleString('en-US')} — #${board.length}: ${board[board.length - 1]!.name} $${board[board.length - 1]!.implied_value_usd.toLocaleString('en-US')}`);
  console.log(`files: board.json, data.js, dashboard (${tree(dashOut).map((f) => basename(f)).join(', ')}), screenshots (${tree(shotOut).map((f) => basename(f)).join(', ')}), dossier.json`);
  console.log(`out: ${outDir}`);
}

main();
