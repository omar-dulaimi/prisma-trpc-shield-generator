#!/usr/bin/env node
/**
 * Checks the tarball a consumer actually receives, not the working tree.
 *
 * The unit tests run against `src/` through vitest, so they pass no matter what `package.sh`
 * puts in `package/`. That gap is where this repo's packaging defects live: `package.sh` used
 * to call a bare `tsc` with no `set -e`, so when tsc was not on PATH the compile failed, the
 * script carried on, `cp -r lib package/lib` failed too, and it printed "Done" and exited 0
 * having assembled a `package/` with no `lib/` in it at all. `npm publish` will ship that
 * happily: a package whose `bin` points at a file that does not exist.
 *
 * So this builds, packs, installs the tarball into an empty directory, and drives the installed
 * binary the way Prisma does, over the generator JSON-RPC handshake.
 *
 * Two conditions are exercised deliberately:
 *
 *   1. The build is run with `node_modules/.bin` stripped from PATH, because that is how the
 *      release workflow used to invoke it and how anyone running `./package.sh` from a shell
 *      invokes it. The script has to resolve its own toolchain.
 *   2. The build is run against a compiler that fails, because "the build broke" must exit
 *      non-zero and must not leave a publishable `package/` behind.
 *
 * Run: pnpm test:package
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const failures = [];
const tempDirs = [];

function step(message) {
  console.log(`\n-> ${message}`);
}

function pass(message) {
  console.log(`  ok    ${message}`);
}

function fail(message, detail) {
  failures.push(detail ? `${message}\n${indent(detail)}` : message);
  console.log(`  FAIL  ${message}`);
  if (detail) console.log(indent(detail));
}

function indent(text) {
  return String(text)
    .trimEnd()
    .split('\n')
    .map((line) => `        ${line}`)
    .join('\n');
}

/** PATH with the repo's own `node_modules/.bin` removed, plus anything that shadows it. */
function pathWithoutLocalBin() {
  const localBin = join(repoRoot, 'node_modules', '.bin');
  return (process.env.PATH ?? '')
    .split(delimiter)
    .filter((entry) => entry && resolve(entry) !== localBin)
    .join(delimiter);
}

function makeTempDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

// --- 1. build with node_modules/.bin off PATH ------------------------------------------------

step('Build the package directory with node_modules/.bin off PATH');
const build = spawnSync('./package.sh', {
  cwd: repoRoot,
  encoding: 'utf8',
  env: { ...process.env, PATH: pathWithoutLocalBin() },
});

if (build.status !== 0) {
  fail(
    `package.sh exited ${build.status} when node_modules/.bin was not on PATH`,
    `${build.stdout ?? ''}${build.stderr ?? ''}`,
  );
} else {
  pass('package.sh exited 0');
}

// --- 2. pack, and check what is in the tarball -------------------------------------------------

const packageDir = join(repoRoot, 'package');
const requiredEntries = [
  'package/package.json',
  'package/README.md',
  'package/LICENSE',
  'package/lib/generator.js',
  'package/lib/index.js',
  'package/lib/prisma-generator.js',
  'package/lib/helpers.js',
  'package/lib/config.js',
  'package/lib/utils/writeFileSafely.js',
];

step('Pack the package directory and inspect the tarball');
let tarball;
if (!existsSync(join(packageDir, 'package.json'))) {
  fail('package/package.json does not exist, so there is nothing to pack');
} else {
  const packDir = makeTempDir('ptsg-pack-');
  try {
    const packed = execFileSync(
      npmCmd,
      ['pack', '--silent', '--pack-destination', packDir],
      { cwd: packageDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
      .trim()
      .split('\n')
      .pop();
    tarball = join(packDir, packed);
    pass(`packed ${packed}`);
  } catch (error) {
    fail('npm pack failed', error.stderr || error.message);
  }
}

if (tarball) {
  const listing = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.replace(/\/$/, ''))
    .filter(Boolean);

  const missing = requiredEntries.filter((entry) => !listing.includes(entry));
  if (missing.length > 0) {
    fail(
      `the tarball is missing ${missing.length} required entr${missing.length === 1 ? 'y' : 'ies'}`,
      `missing:\n${missing.join('\n')}\n\ntarball contains ${listing.length} entries:\n${listing.join('\n')}`,
    );
  } else {
    pass(`all ${requiredEntries.length} required entries present`);
  }

  const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  if (manifest.private === false) {
    pass('package.json is marked public');
  } else {
    fail(`package.json private flag is ${JSON.stringify(manifest.private)}, expected false`);
  }

  const binTarget = manifest.bin?.['prisma-trpc-shield-generator'];
  if (binTarget && listing.includes(`package/${binTarget}`)) {
    pass(`bin target ${binTarget} is in the tarball`);
  } else {
    fail(`bin points at ${binTarget}, which is not in the tarball`);
  }
}

// --- 3. install the tarball into an empty directory and drive the binary ------------------------

if (tarball) {
  step('Install the tarball into an empty directory and run the generator binary');
  const consumer = makeTempDir('ptsg-consumer-');
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'consumer', version: '1.0.0', private: true }, null, 2),
  );

  try {
    execFileSync(npmCmd, ['install', '--no-audit', '--no-fund', tarball], {
      cwd: consumer,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    pass('npm install succeeded');
  } catch (error) {
    fail('npm install of the tarball failed', error.stderr || error.message);
  }

  const installedBin = join(consumer, 'node_modules', '.bin', 'prisma-trpc-shield-generator');
  if (existsSync(installedBin)) {
    pass('node_modules/.bin/prisma-trpc-shield-generator resolves');
  } else {
    fail(
      'node_modules/.bin/prisma-trpc-shield-generator does not resolve, so `prisma generate` cannot find the generator',
    );
  }

  // Prisma talks to a generator over JSON-RPC on stdio. If the binary cannot load its own code
  // or its dependencies, the handshake is where a consumer finds out.
  const handshake = spawnSync(
    process.execPath,
    [join(consumer, 'node_modules', 'prisma-trpc-shield-generator', 'lib', 'generator.js')],
    {
      input: '{"jsonrpc":"2.0","method":"getManifest","params":{},"id":1}\n',
      encoding: 'utf8',
      timeout: 60_000,
    },
  );
  // The protocol puts the JSON-RPC reply on stderr and leaves stdout free for the generator's own
  // logging, so scan both streams rather than assuming which one carries it.
  const manifestReply = `${handshake.stderr ?? ''}\n${handshake.stdout ?? ''}`
    .split('\n')
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return undefined;
      }
    })
    .find((message) => message?.result?.manifest);
  if (manifestReply?.result?.manifest?.prettyName) {
    pass(`getManifest answered with "${manifestReply.result.manifest.prettyName}"`);
  } else {
    fail(
      'the installed binary did not answer the Prisma getManifest handshake',
      `${handshake.stdout ?? ''}${handshake.stderr ?? ''}`,
    );
  }
}

// --- 4. a failing compile must fail the build, not produce an empty package ---------------------

step('A failing compile must exit non-zero and leave nothing publishable behind');
const brokenBuild = makeTempDir('ptsg-broken-');
for (const entry of ['package.sh', 'tsconfig.json', 'package.json', 'README.md', 'LICENSE', 'src']) {
  cpSync(join(repoRoot, entry), join(brokenBuild, entry), { recursive: true });
}
chmodSync(join(brokenBuild, 'package.sh'), 0o755);
mkdirSync(join(brokenBuild, 'node_modules', '.bin'), { recursive: true });
// A compiler that is exactly where the script should look for it and always fails, so what is
// being measured is "the build broke", not "the toolchain was missing".
writeFileSync(
  join(brokenBuild, 'node_modules', '.bin', 'tsc'),
  '#!/bin/sh\necho "error TS0000: simulated compile failure" >&2\nexit 2\n',
);
chmodSync(join(brokenBuild, 'node_modules', '.bin', 'tsc'), 0o755);

const broken = spawnSync('./package.sh', {
  cwd: brokenBuild,
  encoding: 'utf8',
  env: { ...process.env, PATH: pathWithoutLocalBin() },
});

if (broken.status !== 0) {
  pass(`package.sh exited ${broken.status} when the compile failed`);
} else {
  fail(
    'package.sh exited 0 even though the compile failed, so a broken build looks like a good one',
    `${broken.stdout ?? ''}${broken.stderr ?? ''}`,
  );
}

if (existsSync(join(brokenBuild, 'package', 'package.json'))) {
  fail(
    'a failed build still left package/package.json behind, which is enough for `npm publish` to ship an empty package',
  );
} else {
  pass('no publishable package/ was left behind');
}

// --- report -------------------------------------------------------------------------------------

for (const dir of tempDirs) {
  rmSync(dir, { recursive: true, force: true });
}

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} package check(s) failed:\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('All package checks passed.');
