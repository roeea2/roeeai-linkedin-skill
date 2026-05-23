/**
 * Extracts the li_at session cookie from the saved Playwright LinkedIn session.
 * Run this locally to get the value to store as LINKEDIN_LI_AT env var.
 * Usage: node extract_cookie.js
 */
const { chromium } = require('playwright');
const path = require('path');

const AUTH_DIR = path.join(__dirname, 'linkedin-auth');

async function extract() {
  const context = await chromium.launchPersistentContext(AUTH_DIR, {
    headless: true,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  await page.goto('https://www.linkedin.com', { waitUntil: 'domcontentloaded', timeout: 20000 });

  const cookies = await context.cookies('https://www.linkedin.com');
  const liAt = cookies.find(c => c.name === 'li_at');

  await context.close();

  if (!liAt) {
    console.error('li_at cookie not found. Make sure you are logged in. Run: node linkedin_setup.js');
    process.exit(1);
  }

  console.log('\nLINKEDIN_LI_AT cookie value (store this as an env var):\n');
  console.log(liAt.value);
  console.log('\nExpires:', new Date(liAt.expires * 1000).toISOString());
}

extract();
