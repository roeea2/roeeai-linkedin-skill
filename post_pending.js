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

function downloadImage(url, dest) {
  execSync(`curl -s -L "${url}" -o "${dest}"`, { timeout: 30000 });
  return fs.existsSync(dest) && fs.statSync(dest).size > 0;
}

function parseDraft(draftPath) {
  const raw = fs.readFileSync(draftPath, 'utf8');
  const imageMatch = raw.match(/^IMAGE_URL:\s*(.+)$/m);
  const imageUrl = imageMatch ? imageMatch[1].trim() : null;
  const text = raw.replace(/^IMAGE_URL:\s*.+\n?/m, '').trim();
  return { text, imageUrl };
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
    const { text, imageUrl } = parseDraft(draftPath);
    log(`Processing draft: ${file}`);
    if (imageUrl) log(`Image URL: ${imageUrl}`);
    log(text);

    // Write clean text to temp file (without IMAGE_URL header)
    const tmpPost = `/tmp/linkedin_post_${Date.now()}.txt`;
    fs.writeFileSync(tmpPost, text);

    // Download image if present
    let imagePath = null;
    if (imageUrl) {
      const ext = imageUrl.split('?')[0].match(/\.(jpg|jpeg|png|webp)$/i)?.[1] || 'jpg';
      imagePath = `/tmp/linkedin_image_${Date.now()}.${ext}`;
      log('Downloading image...');
      const ok = downloadImage(imageUrl, imagePath);
      if (!ok) {
        log('Image download failed — posting without image');
        imagePath = null;
      } else {
        log('Image downloaded');
      }
    }

    const personalOk = runScript('post_linkedin.js', tmpPost, imagePath ? [imagePath] : []);
    log(`Personal profile: ${personalOk ? 'SUCCESS' : 'FAILED'}`);

    const pageOk = runScript('post_linkedin_page.js', tmpPost, [COMPANY_ID, ...(imagePath ? [imagePath] : [])]);
    log(`Company page: ${pageOk ? 'SUCCESS' : 'FAILED'}`);

    if (personalOk || pageOk) {
      const dest = path.join(POSTED_DIR, file);
      fs.renameSync(draftPath, dest);
      try { fs.unlinkSync(tmpPost); } catch {}
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
