/**
 * Run this ONCE to authenticate with LinkedIn.
 * Your session is saved in ./linkedin-auth/ and reused for all future posts.
 * Usage: node linkedin_setup.js
 */
const { chromium } = require('playwright');
const path = require('path');

const AUTH_DIR = path.join(__dirname, 'linkedin-auth');

async function setup() {
  console.log('\n🔐 LinkedIn One-Time Authentication Setup\n');
  console.log('A browser window will open. Log in to LinkedIn manually.');
  console.log('Once you reach your feed, close the browser.\n');

  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/login');

  console.log('Waiting for login... (you have 3 minutes)\n');

  try {
    await page.waitForURL('**/feed**', { timeout: 180000 });
    console.log('\n✅ Login successful! Session saved to ./linkedin-auth/');
    console.log('You can now run: node post_linkedin.js <post-file>\n');
  } catch {
    console.error('\n❌ Timed out waiting for login. Please try again.');
  }

  await context.close();
}

setup().catch(console.error);
