/**
 * Local cron script: checks drafts/pending/, posts each draft to LinkedIn,
 * then moves it to drafts/posted/.
 * Run via cron: every hour — node /Users/roeea/Documents/Linkedin/post_pending.js
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const PENDING_DIR = path.join(ROOT, 'drafts', 'pending');
const POSTED_DIR = path.join(ROOT, 'drafts', 'posted');
const COMPANY_ID = '108819055';

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function runScript(scriptName, draftPath, extraArgs = []) {
  const result = spawnSync(
    'node',
    [path.join(ROOT, scriptName), draftPath, ...extraArgs],
    { env: { ...process.env }, encoding: 'utf8', timeout: 120000 }
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status === 0;
}

async function main() {
  // Pull latest drafts from GitHub
  log('Pulling latest from GitHub...');
  try {
    execSync('git pull --ff-only', { cwd: ROOT, stdio: 'inherit' });
  } catch {
    log('git pull failed — skipping this run');
    process.exit(1);
  }

  const files = fs.readdirSync(PENDING_DIR).filter(f => f.endsWith('.txt'));

  if (files.length === 0) {
    log('No pending drafts.');
    return;
  }

  for (const file of files) {
    const draftPath = path.join(PENDING_DIR, file);
    log(`Processing draft: ${file}`);
    log(fs.readFileSync(draftPath, 'utf8'));

    const personalOk = runScript('post_linkedin.js', draftPath);
    log(`Personal profile: ${personalOk ? 'SUCCESS' : 'FAILED'}`);

    const pageOk = runScript('post_linkedin_page.js', draftPath, [COMPANY_ID]);
    log(`Company page: ${pageOk ? 'SUCCESS' : 'FAILED'}`);

    if (personalOk || pageOk) {
      const dest = path.join(POSTED_DIR, file);
      fs.renameSync(draftPath, dest);
      log(`Moved to posted: ${file}`);

      try {
        execSync(`git add drafts/ && git commit -m "Mark ${file} as posted" && git push`, {
          cwd: ROOT,
          stdio: 'inherit',
        });
      } catch {
        log('git commit/push failed — draft still moved locally');
      }
    } else {
      log(`Both posts failed for ${file} — leaving in pending`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
