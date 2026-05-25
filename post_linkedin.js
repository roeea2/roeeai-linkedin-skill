/**
 * Posts content to LinkedIn.
 * Local mode:  uses saved Playwright session in linkedin-auth/
 * Cloud mode:  set LINKEDIN_LI_AT env var with the li_at cookie value
 * Usage: node post_linkedin.js <path-to-post-file>
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, 'linkedin-auth');
const POST_FILE = process.argv[2];
const IMAGE_PATH = process.argv[3] || null;
const LI_AT = process.env.LINKEDIN_LI_AT;
const IS_CLOUD = !!LI_AT;

if (!POST_FILE) {
  console.error('Usage: node post_linkedin.js <path-to-post-file>');
  process.exit(1);
}

if (!fs.existsSync(POST_FILE)) {
  console.error(`File not found: ${POST_FILE}`);
  process.exit(1);
}

if (!IS_CLOUD && !fs.existsSync(AUTH_DIR)) {
  console.error('No saved session found. Run: node linkedin_setup.js first, or set LINKEDIN_LI_AT env var.');
  process.exit(1);
}

const content = fs.readFileSync(POST_FILE, 'utf8').trim();
if (!content) {
  console.error('Post file is empty.');
  process.exit(1);
}

async function buildContext() {
  if (IS_CLOUD) {
    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    await ctx.addCookies([{
      name: 'li_at',
      value: LI_AT,
      domain: '.linkedin.com',
      path: '/',
      httpOnly: true,
      secure: true,
    }]);
    return { context: ctx, browser };
  } else {
    const ctx = await chromium.launchPersistentContext(AUTH_DIR, {
      headless: false,
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    return { context: ctx, browser: null };
  }
}

async function pasteContent(page, editor, text) {
  await editor.click();
  await page.waitForTimeout(300);

  // Try execCommand first (cross-platform, works headless)
  const inserted = await page.evaluate((t) => {
    try {
      document.execCommand('insertText', false, t);
      return true;
    } catch {
      return false;
    }
  }, text);

  if (inserted) {
    await page.waitForTimeout(500);
    const editorText = await editor.textContent();
    if (editorText && editorText.trim().length > 10) return;
  }

  // Fallback: platform-aware clipboard paste
  try {
    await page.evaluate(async (t) => { await navigator.clipboard.writeText(t); }, text);
    const pasteKey = process.platform === 'darwin' ? 'Meta+v' : 'Control+v';
    await page.keyboard.press(pasteKey);
    await page.waitForTimeout(800);
    const editorText = await editor.textContent();
    if (editorText && editorText.trim().length > 10) return;
  } catch {
    // ignore
  }

  // Last resort: type it out
  console.log('Falling back to keyboard typing...');
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(text, { delay: 10 });
}

async function postToLinkedIn() {
  const { context, browser } = await buildContext();
  const page = await context.newPage();

  try {
    console.log(`Navigating to LinkedIn feed... (${IS_CLOUD ? 'cloud mode' : 'local mode'})`);
    await page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    if (page.url().includes('/login') || page.url().includes('/checkpoint')) {
      console.error('Session expired. Run: node linkedin_setup.js to re-authenticate, or refresh LINKEDIN_LI_AT.');
      await (browser || context).close();
      process.exit(1);
    }

    console.log('Authenticated');
    // Wait longer for feed to fully render (VPS may be slower)
    await page.waitForTimeout(4000);

    const startPostSelectors = [
      'button:has-text("Start a post")',
      '[aria-label="Start a post"]',
      '.share-box-feed-entry__trigger',
      '[data-view-name="share-box-feed-entry"]',
      '.share-creation-state__avatar-image',
      '[placeholder*="post"]',
      'div[role="button"]:has-text("Start a post")',
      'span:has-text("Start a post")',
      '[data-control-name="share.start_a_post"]',
      'button[class*="share-box"]',
      'div[class*="share-creation-state"]',
    ];

    let opened = false;
    for (const sel of startPostSelectors) {
      try {
        await page.locator(sel).first().click({ timeout: 5000 });
        opened = true;
        console.log(`Opened composer with: ${sel}`);
        break;
      } catch {
        // try next
      }
    }

    if (!opened) throw new Error('Could not find "Start a post" button.');
    console.log('Composer opened');
    await page.waitForTimeout(2000);

    const editorSelectors = [
      '.ql-editor[contenteditable="true"]',
      '[role="textbox"][contenteditable="true"]',
      '.editor-content[contenteditable="true"]',
      'div[contenteditable="true"]',
    ];

    let editor = null;
    for (const sel of editorSelectors) {
      const loc = page.locator(sel).first();
      try {
        await loc.waitFor({ timeout: 4000 });
        editor = loc;
        break;
      } catch {
        // try next
      }
    }

    if (!editor) throw new Error('Could not find post editor.');

    // Enter text FIRST (this always works)
    await pasteContent(page, editor, content);
    console.log('Content entered');

    // Verify text was actually inserted
    const enteredText = await editor.textContent();
    if (!enteredText || enteredText.trim().length < 10) {
      throw new Error('Text was not inserted into editor — aborting to avoid empty post.');
    }
    await page.waitForTimeout(1500);

    // Attach image AFTER text via direct file input (bypasses media editor modal)
    if (IMAGE_PATH && fs.existsSync(IMAGE_PATH)) {
      console.log('Attaching image...');
      try {
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.setInputFiles(IMAGE_PATH);
          await page.waitForTimeout(4000);
          console.log('Image attached via file input');
        } else {
          // Fallback: trigger file chooser via button click
          const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser', { timeout: 5000 }),
            page.locator('button[aria-label="Add media"], button:has-text("Add media")').first().click({ timeout: 3000 }),
          ]);
          await fileChooser.setFiles(IMAGE_PATH);
          await page.waitForTimeout(4000);
          console.log('Image attached via file chooser');
          // Handle Next → Done steps in media editor
          for (const label of ['Next', 'Done']) {
            try {
              await page.locator(`button:has-text("${label}")`).first().click({ timeout: 3000 });
              console.log(`Media editor: clicked "${label}"`);
              await page.waitForTimeout(2000);
            } catch { /* step not present */ }
          }
        }
      } catch (imgErr) {
        console.log(`Image attach failed (${imgErr.message}) — posting without image`);
      }
      await page.waitForTimeout(1000);
    }

    const postButtonSelectors = [
      'button.share-actions__primary-action',
      'button[data-control-name="share.post"]',
      'button:has-text("Post"):not([disabled])',
      '[aria-label="Post"]',
    ];

    let posted = false;
    for (const sel of postButtonSelectors) {
      try {
        await page.locator(sel).first().click({ timeout: 4000 });
        posted = true;
        break;
      } catch {
        // try next
      }
    }

    if (!posted) throw new Error('Could not find Post button. Post was NOT published.');

    // Wait for composer modal to actually close (real confirmation of publish)
    try {
      await page.waitForSelector('[data-test-modal-id="sharebox"]', { state: 'hidden', timeout: 15000 });
      console.log('\nPost published successfully on LinkedIn!\n');
    } catch {
      throw new Error('Composer modal still open after clicking Post — post was NOT published (possible duplicate content or LinkedIn rejection).');
    }

  } catch (err) {
    console.error('\nError:', err.message);
    await (browser || context).close();
    process.exit(1);
  }

  await (browser || context).close();
}

postToLinkedIn();
