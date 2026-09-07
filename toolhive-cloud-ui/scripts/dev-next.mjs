// Launches `next dev` with a V8 heap cap that actually propagates to the
// forked dev-server child process (next/dist/server/lib/start-server.js).
//
// Why a wrapper instead of `node --max-old-space-size=2048 next dev`?
// Next.js reads the heap cap ONLY from the NODE_OPTIONS env var when deciding
// whether to override it for the forked server process. A flag on the `node`
// CLI lands in `process.execArgv` and is ignored by next-dev.js's
// getMaxOldSpaceSize(), so Next silently replaces it with 50% of total RAM.
// Setting NODE_OPTIONS here makes the cap flow to both the launcher and the
// forked start-server.js child, and works in any shell (cmd / bash / WSL).
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const LIMIT = process.env.NEXT_MAX_OLD_SPACE_SIZE || '2048';

const parts = (process.env.NODE_OPTIONS || '')
  .split(/\s+/)
  .filter(Boolean);
if (!parts.some((p) => p.startsWith('--max-old-space-size'))) {
  parts.push(`--max-old-space-size=${LIMIT}`);
}
process.env.NODE_OPTIONS = parts.join(' ');

const nextBin = fileURLToPath(
  new URL('../node_modules/next/dist/bin/next', import.meta.url),
);

// Serve the dev server over HTTPS using the project's local certs so that
// BETTER_AUTH_URL=https://localhost:3000 and the OIDC callback URIs line up.
// (Next auto-generates a self-signed cert when no cert is given, but we have a
// valid localhost cert in ./certs, so we pin it explicitly.)
const certsKey = fileURLToPath(new URL('../certs/key.pem', import.meta.url));
const certsCert = fileURLToPath(new URL('../certs/cert.pem', import.meta.url));

const child = spawn(
  process.execPath,
  [
    nextBin,
    'dev',
    '--experimental-https',
    '--experimental-https-key',
    certsKey,
    '--experimental-https-cert',
    certsCert,
    ...process.argv.slice(2),
  ],
  {
    stdio: 'inherit',
    env: process.env,
  },
);

child.on('exit', (code) => process.exit(code ?? 0));
