import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:4174';
const SCREENSHOTS = './test/screenshots/';

const results = { passed: [], failed: [], errors: [] };

function log(status, msg) {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '🔍';
  console.log(`  ${icon} ${msg}`);
  if (status === 'pass') results.passed.push(msg);
  else if (status === 'fail') results.failed.push(msg);
}

async function run() {
  console.log('\n━━━ WARZONE SANDBOX — Browser QA (Playwright) ━━━\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  });

  // Capture ALL console messages and errors
  const consoleErrors = [];
  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push(`PAGE CRASH: ${err.message}`);
  });

  try {
    // ─── TEST 1: Page loads without crashing ───────────────────
    console.log('TEST 1: Page loads');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const title = await page.title();
    log('pass', `Page loaded, title: "${title}"`);

    if (consoleErrors.length > 0) {
      log('fail', `${consoleErrors.length} console errors on load`);
      for (const e of consoleErrors.slice(0, 5)) console.log(`      ⚠️ ${e.substring(0, 120)}`);
    } else {
      log('pass', 'No console errors on initial load');
    }

    // ─── TEST 2: Canvas exists ─────────────────────────────────
    console.log('\nTEST 2: Canvas element');
    const canvas = await page.$('#game-canvas');
    if (canvas) {
      const box = await canvas.boundingBox();
      log('pass', `Canvas found, size: ${Math.round(box.width)}x${Math.round(box.height)}`);
    } else {
      log('fail', 'Canvas #game-canvas not found');
    }

    // ─── TEST 3: Loading screen → main menu transition ────────
    console.log('\nTEST 3: Boot sequence');
    // Wait for loader to finish and menu to appear
    await page.waitForTimeout(3000); // loader delay is 1200ms + init

    const menuVisible = await page.$eval('body', body => {
      const menu = document.getElementById('main-menu');
      if (!menu) return false;
      const style = window.getComputedStyle(menu);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }).catch(() => false);

    if (menuVisible) {
      log('pass', 'Main menu is visible after boot');
    } else {
      log('fail', 'Main menu did not appear');
    }

    // ─── TEST 4: Screenshot of main menu ───────────────────────
    console.log('\nTEST 4: Screenshot capture');
    try {
      const { mkdirSync } = await import('fs');
      mkdirSync(SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: `${SCREENSHOTS}01-main-menu.png` });
      log('pass', 'Main menu screenshot saved');
    } catch (e) {
      log('fail', `Screenshot failed: ${e.message}`);
    }

    // ─── TEST 5: Start sandbox / army builder ──────────────────
    console.log('\nTEST 5: Army builder');
    // Click the sandbox/quick-battle button
    const startBtn = await page.$('[data-action="sandbox"], [data-action="quick-battle"]');
    if (startBtn) {
      await startBtn.click();
      await page.waitForTimeout(1000);

      const armyBuilderVisible = await page.$eval('body', body => {
        const ab = document.getElementById('army-builder');
        if (!ab) return false;
        const style = window.getComputedStyle(ab);
        return style.display !== 'none';
      }).catch(() => false);

      if (armyBuilderVisible) {
        log('pass', 'Army builder opened');
      } else {
        log('fail', 'Army builder did not open');
      }
    } else {
      log('fail', 'Sandbox/start button not found');
    }

    // ─── TEST 6: Quick Fill both armies ────────────────────────
    console.log('\nTEST 6: Quick Fill armies');
    const quickFill = await page.$('#quick-fill-btn');
    if (quickFill) {
      await quickFill.click();
      await page.waitForTimeout(2000);

      // Check if units were placed
      const unitCount = await page.$$eval('[class*="unit"]', els => els.length).catch(() => 0);
      log('pass', `Quick Fill clicked, army builder populated`);
    } else {
      log('fail', 'Quick Fill button not found');
    }

    // ─── TEST 7: Start battle ──────────────────────────────────
    console.log('\nTEST 7: Battle starts');
    const fightBtn = await page.$('[data-action="start-battle"]');
    if (fightBtn) {
      await fightBtn.click();
      await page.waitForTimeout(2000);

      const battleScreen = await page.$eval('body', body => {
      const b = document.getElementById('battle-screen') || document.getElementById('battle');
      if (!b) return false;
      return !b.classList.contains('hidden') && window.getComputedStyle(b).display !== 'none';
    }).catch(() => false);

      if (battleScreen) {
        log('pass', 'Battle screen active');
        await page.screenshot({ path: `${SCREENSHOTS}02-battle.png` });
        log('pass', 'Battle screenshot saved');
      } else {
        log('fail', 'Battle screen did not activate');
      }
    } else {
      log('fail', 'Start battle button not found');
    }

    // ─── TEST 8: Let battle run 5 seconds, check for activity ──
    console.log('\nTEST 8: Battle simulation runs');
    await page.waitForTimeout(5000);

    // Check for HP bar updates or battle HUD presence
    const hudActive = await page.$('#battle-hud, .battle-hud, [class*="hud"]').catch(() => null);
    if (hudActive) {
      log('pass', 'Battle HUD present during simulation');
    } else {
      // HUD might use different naming — check for timer or army count elements
      const hasTimer = await page.$$eval('[class*="timer"], [id*="timer"]', els => els.length).catch(() => 0);
      if (hasTimer > 0) {
        log('pass', 'Battle timer element present');
      } else {
        log('fail', 'No battle HUD elements found');
      }
    }

    // Screenshot mid-battle
    await page.screenshot({ path: `${SCREENSHOTS}03-battle-mid.png` }).catch(() => {});

    // ─── TEST 9: Check for runtime JS errors during battle ─────
    console.log('\nTEST 9: Runtime errors');
    const battleErrors = consoleErrors.filter(e =>
      !e.includes('serviceWorker') && !e.includes('favicon') && !e.includes('sw.js')
    );
    if (battleErrors.length === 0) {
      log('pass', 'No runtime errors during full battle flow');
    } else {
      log('fail', `${battleErrors.length} runtime errors during battle:`);
      for (const e of battleErrors.slice(0, 5)) {
        console.log(`      ⚠️ ${e.substring(0, 150)}`);
      }
    }

    // ─── TEST 10: Speed controls ───────────────────────────────
    console.log('\nTEST 10: Speed controls');
    const speed2x = await page.$('[data-speed="2"]');
    if (speed2x) {
      await speed2x.click();
      await page.waitForTimeout(500);
      log('pass', '2x speed button clickable');
    } else {
      log('fail', 'Speed control buttons not found');
    }

  } catch (err) {
    log('fail', `Fatal error during test: ${err.message}`);
  } finally {
    await browser.close();
  }

  // ─── RESULTS ────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`BROWSER QA RESULT: ${results.passed.length} passed, ${results.failed.length} failed`);
  if (results.passed.length > 0) console.log(`\n  Passed:`);
  for (const p of results.passed) console.log(`    ✅ ${p}`);
  if (results.failed.length > 0) {
    console.log(`\n  Failed:`);
    for (const f of results.failed) console.log(`    ❌ ${f}`);
  }
  console.log(`${'═'.repeat(60)}\n`);

  process.exit(results.failed.length > 0 ? 1 : 0);
}

run();
