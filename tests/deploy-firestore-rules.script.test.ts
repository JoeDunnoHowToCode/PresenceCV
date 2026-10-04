import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

// Runs a copy of scripts/deploy-firestore-rules.mjs in a scratch checkout whose
// ./node_modules/.bin/firebase is a stub. The stub records where the real CLI
// would deploy: the `--config` file if one is passed, else ./firebase.json, with
// the database defaulting to "(default)" and `rules` resolved next to the config.
const FIREBASE_STUB = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const at = args.indexOf('--config');
const configPath = at === -1 ? 'firebase.json' : args[at + 1];
const { firestore } = JSON.parse(fs.readFileSync(configPath, 'utf8'));
fs.writeFileSync(process.env.STUB_RECORD, JSON.stringify({
  database: firestore.database ?? '(default)',
  rulesFile: path.resolve(path.dirname(configPath), firestore.rules),
}));
`;

const repo = resolve(__dirname, '..');
let dir: string;

function runDeploy(env: Record<string, string>) {
  dir = realpathSync(mkdtempSync(join(tmpdir(), 'deploy-rules-')));
  mkdirSync(join(dir, 'scripts'));
  mkdirSync(join(dir, 'node_modules/.bin'), { recursive: true });
  for (const file of ['scripts/deploy-firestore-rules.mjs', 'firebase.json', 'firestore.rules']) {
    copyFileSync(join(repo, file), join(dir, file));
  }
  writeFileSync(join(dir, 'node_modules/.bin/firebase'), FIREBASE_STUB);
  chmodSync(join(dir, 'node_modules/.bin/firebase'), 0o755);

  const recordPath = join(dir, 'node_modules/stub-record.json');
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    FIREBASE_SERVICE_ACCOUNT_KEY: JSON.stringify({ project_id: 'demo-presencecv' }),
    STUB_RECORD: recordPath,
  };
  delete childEnv.FIREBASE_DATABASE_ID;
  const result = spawnSync(process.execPath, ['scripts/deploy-firestore-rules.mjs'], {
    cwd: dir,
    env: { ...childEnv, ...env },
    encoding: 'utf8',
  });
  if (!existsSync(recordPath)) {
    throw new Error(`firebase stub was not called:\n${result.stdout}${result.stderr}`);
  }
  return JSON.parse(readFileSync(recordPath, 'utf8'));
}

describe('deploy-firestore-rules script', () => {
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it.each([
    { label: 'set', env: { FIREBASE_DATABASE_ID: 'ai-studio-test' }, database: 'ai-studio-test' },
    { label: 'unset', env: {}, database: '(default)' },
  ])('deploys firestore.rules to $database when FIREBASE_DATABASE_ID is $label', ({ env, database }) => {
    expect(runDeploy(env)).toEqual({ database, rulesFile: join(dir, 'firestore.rules') });
  });
});
