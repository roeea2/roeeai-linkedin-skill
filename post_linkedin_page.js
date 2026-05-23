/**
 * Posts content to a LinkedIn company page via the admin dashboard.
 * Local mode:  uses saved Playwright session in linkedin-auth/
 * Cloud mode:  set LINKEDIN_LI_AT env var with the li_at cookie value
 * Usage: node post_linkedin_page.js <path-to-post-file> [company-id]
 * Example: node post_linkedin_page.js /tmp/linkedin_draft.txt 108819055
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, 'linkedin-auth');
const POST_FILE = process.argv[2];
const COMPANY_ID = process.argv[3] || '108819055';
const LI_AT = process.env.LINKEDIN_LI_AT;
const IS_CLOUD = !!LI_AT;

if (!POST_FILE) {
  console.error('Usage: node post_linkedin_page.js <path-to-post-file> [company-id]');
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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
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

  console.log('Falling back to keyboard typing...');
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(text, { delay: 10 });
}

async function postToLinkedInPage() {
  const { context, browser } = await buildContext();
  const page = await context.newPage();

  try {
    console.log(`Navigating to company admin dashboard... (${IS_CLOUD ? 'cloud mode' : 'local mode'})`);
    await page.goto(
      `https://www.linkedin.com/company/${COMPANY_ID}/admin/dashboard/`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    if (page.url().includes('/login') || page.url().includes('/checkpoint')) {
      console.error('Session expired. Run: node linkedin_setup.js to re-authenticate, or refresh LINKEDIN_LI_AT.');
      await (browser || context).close();
      process.exit(1);
    }

    if (page.url().includes('/unavailable')) {
      console.error(`Company page ${COMPANY_ID} not found or not accessible.`);
      await (browser || context).close();
      process.exit(1);
    }

    console.log('Authenticated');
    await page.waitForTimeout(2000);

    await page.locator('button:has-text("Create")').first().click({ timeout: 5000 });
    console.log('Create menu opened');
    await page.waitForTimeout(1500);

    await page.locator('a:has-text("Start a post")').first().click({ timeout: 5000 });
    console.log('Composer opened');
    await page.waitForTimeout(2500);

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
        await loc.waitFor({ timeout: 5000 });
        editor = loc;
        break;
      } catch {
        // try next
      }
    }

    if (!editor) throw new Error('Could not find post editor.');

    await pasteContent(page, editor, content);
    console.log('Content entered');
    await page.waitForTimeout(1500);

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

    await page.waitForTimeout(3000);
    console.log('\nPost published successfully on LinkedIn page!\n');

  } catch (err) {
    console.error('\nError:', err.message);
    await (browser || context).close();
    process.exit(1);
  }

  await (browser || context).close();
}

postToLinkedInPage();
