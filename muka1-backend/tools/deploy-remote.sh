#!/usr/bin/env bash
# Run from muka1-backend after preview verification. Never enable shell tracing.
set +x
set -euo pipefail
umask 077
: "${CLOUDFLARE_API_TOKEN:?Set the environment secret first}"
: "${CLOUDFLARE_ACCOUNT_ID:?Set the environment secret first}"
export WRANGLER_SEND_METRICS=false
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-/tmp/muka1-wrangler-config}"
backup_dir="${MUKA_BACKUP_DIR:?Choose a private backup directory outside the repository}"
# Resolve symlinks and reject backups inside the checkout before creating files.
repo_root="$(git rev-parse --show-toplevel)"
backup_dir="$(realpath -m -- "$backup_dir")"
case "$backup_dir/" in "$repo_root/"*) echo 'Backup directory must be outside the repository' >&2; exit 1;; esac
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
# Require the lockfile installation; npx must not choose an unrelated cached CLI.
node --input-type=module <<'JS'
import {readFileSync} from 'node:fs';
try {
  const wanted=JSON.parse(readFileSync('package.json','utf8')).devDependencies.wrangler;
  const installed=JSON.parse(readFileSync('node_modules/wrangler/package.json','utf8')).version;
  if(installed!==wanted)throw Error('version mismatch');
} catch {
  throw Error('Run npm ci in muka1-backend before deploying');
}
JS
node --test tests/*.test.mjs
# Discover only the existing named database. Do not create or select a substitute.
node --input-type=module <<'JS'
import {readFileSync,writeFileSync} from 'node:fs';
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(!/^[a-f0-9]{32}$/i.test(account))throw Error('Invalid account ID');
const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database?name=muka1-db',{headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN}});
const data=await response.json();
const matches=(data.result||[]).filter(x=>x.name==='muka1-db');
if(!response.ok||!data.success||matches.length!==1)throw Error('Cannot access the existing muka1-db');
writeFileSync('.wrangler-deploy.toml',readFileSync('wrangler.toml','utf8').replace('REPLACE_WITH_D1_ID',matches[0].uuid),{mode:0o600});
JS
trap 'rm -f .wrangler-deploy.toml' EXIT
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup="$backup_dir/muka1-before-$stamp.sql"
npx --no-install wrangler d1 export muka1-db --config=.wrangler-deploy.toml --remote --output="$backup"
test -s "$backup"
sha256sum "$backup" > "$backup.sha256"
# Refuse migration unless the stored export passes its checksum.
sha256sum --check "$backup.sha256"
# Abort if deployment slipped past the catalog switch. Move the cutover to a
# future JST day and rerun compatibility/browser tests before a later release.
node tools/check-cutover.mjs
npx --no-install wrangler d1 migrations apply muka1-db --config=.wrangler-deploy.toml --remote
npx --no-install wrangler d1 execute muka1-db --config=.wrangler-deploy.toml --remote --file=verify.sql
# Existing ADMIN_TOKEN is retained. Never retrieve or overwrite its value.
node tools/check-cutover.mjs
npx --no-install wrangler deploy --config=.wrangler-deploy.toml
curl --fail --silent --show-error https://muka1-api.pwgmjda00.workers.dev/health | node --input-type=module -e 'let s="";for await(const c of process.stdin)s+=c;const d=JSON.parse(s);if(!d.ok||d.catalog!==512)process.exit(1);console.log("Worker and D1: 512 catalog healthy")'
