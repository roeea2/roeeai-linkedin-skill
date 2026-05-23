/**
 * Posts content to LinkedIn using a saved auth session.
 * Requires: node linkedin_setup.js to be run first.
 * Usage: node post_linkedin.js <path-to-post-file>
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, 'linkedin-auth');
const POST_FILE = process.argv[2];

if (!POST_FILE) {
  console.error('Usage: node post_linkedin.js <path-to-post-file>');
  process.exit(1);
}

if (!fs.existsSync(POST_FILE)) {
  console.error(`File not found: ${POST_FILE}`);
  process.exit(1);
}

if (!fs.existsSync(AUTH_DIR)) {
  console.error('No saved session found. Run: node linkedin_setup.js first.');
  process.exit(1);
}

const content = fs.readFileSync(POST_FILE, 'utf8').trim();
if (!content) {
  console.error('Post file is empty.');
  process.exit(1);
}

async function postToLinkedIn() {
  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to LinkedIn feed...');
    await page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    if (page.url().includes('/login') || page.url().includes('/checkpoint')) {
      console.error('❌ Session expired. Run: node linkedin_setup.js to re-authenticate.');
      await context.close();
      process.exit(1);
    }

    console.log('✓ Authenticated');
    await page.waitForTimeout(2000);

    // --- Open the post composer ---
    const startPostSelectors = [
      'button:has-text("Start a post")',
      '[aria-label="Start a post"]',
      '.share-box-feed-entry__trigger',
      '[data-view-name="share-box-feed-entry"]',
      '.share-creation-state__avatar-image', // clicking avatar area also opens composer
    ];

    let opened = false;
    for (const sel of startPostSelectors) {
      try {
        await page.locator(sel).first().click({ timeout: 4000 });
        opened = true;
        break;
      } catch {
        // try next selector
      }
    }

    if (!opened) {
      throw new Error('Could not find "Start a post" button. LinkedIn UI may have changed.');
    }

    console.log('✓ Composer opened');
    await page.waitForTimeout(2000);

    // --- Find the editor ---
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
        // try next selector
      }
    }

    if (!editor) {
      throw new Error('Could not find post editor. LinkedIn UI may have changed.');
    }

    await editor.click();
    await page.waitForTimeout(500);

    // Use clipboard paste for reliable multi-line content with special chars
    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
    }, content);

    await page.keyboard.press('Meta+v');
    await page.waitForTimeout(1000);

    // Verify content was pasted; fall back to typing if not
    const editorText = await editor.textContent();
    if (!editorText || editorText.trim().length < 10) {
      console.log('Clipboard paste failed, typing directly...');
      await editor.click();
      await page.keyboard.press('Meta+a');
      await page.keyboard.press('Backspace');
      await page.keyboard.type(content, { delay: 15 });
    }

    console.log('✓ Content entered');
    await page.waitForTimeout(1500);

    // --- Click Post ---
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
        // try next selector
      }
    }

    if (!posted) {
      throw new Error('Could not find Post button. Post was NOT published.');
    }

    await page.waitForTimeout(3000);
    console.log('\n✅ Post published successfully on LinkedIn!\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    await context.close();
    process.exit(1);
  }

  await context.close();
}

postToLinkedIn();
