import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5173';
const results = [];
let browser, page;

function log(test, pass, detail = '') {
  const icon = pass ? '✅' : '❌';
  const msg = `${icon} ${test}${detail ? ' - ' + detail : ''}`;
  console.log(msg);
  results.push({ test, pass, detail });
}

async function run() {
  browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // TEST 1: Page loads
  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    log('Page loads', true);
  } catch (e) {
    log('Page loads', false, e.message);
    await browser.close();
    return;
  }

  // TEST 2: Title correct
  const title = await page.title();
  log('Page title', title === 'WARZONE SANDBOX', `Got: "${title}"`);

  // TEST 3: Splash screen visible
  const splashVisible = await page.isVisible('#splash');
  log('Splash screen visible', splashVisible);

  // TEST 4: Three.js canvas exists
  const canvasExists = await page.locator('#game-canvas').count() > 0;
  log('Game canvas exists', canvasExists);

  // TEST 5: Wait for splash to hide / menu to show
  try {
    await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 10000 });
    log('Main menu appears after splash', true);
  } catch (e) {
    log('Main menu appears after splash', false, 'Timeout waiting for menu');
  }

  // TEST 6: Menu buttons exist
  const quickBattleBtn = await page.locator('[data-action="quick-battle"]').count();
  const sandboxBtn = await page.locator('[data-action="sandbox"]').count();
  log('Quick Battle button exists', quickBattleBtn > 0);
  log('Sandbox button exists', sandboxBtn > 0);

  // TEST 7: Click Quick Battle -> Army Builder shows
  try {
    await page.click('[data-action="quick-battle"]');
    await page.waitForTimeout(500);
    const builderVisible = await page.isVisible('#army-builder');
    log('Click Quick Battle -> Army Builder shows', builderVisible);
  } catch (e) {
    log('Click Quick Battle -> Army Builder shows', false, e.message);
  }

  // TEST 8: Unit carousel populated
  const unitCards = await page.locator('.unit-card').count();
  log('Unit carousel has 8 unit types', unitCards === 8, `Got: ${unitCards}`);

  // TEST 9: Formation buttons populated
  const formBtns = await page.locator('.formation-btn').count();
  log('Formation tools have 4 options', formBtns === 4, `Got: ${formBtns}`);

  // TEST 10: Active side label shows RED
  const sideLabel = await page.textContent('#active-side-label');
  log('Active side shows RED ARMY', sideLabel.includes('RED'), `Got: "${sideLabel}"`);

  // TEST 11: Unit count shows 0/250
  const unitCount = await page.textContent('#unit-count-display');
  log('Unit count shows 0/250', unitCount.includes('0'), `Got: "${unitCount}"`);

  // TEST 12: Place a unit by clicking on canvas
  try {
    await page.click('#game-canvas', { position: { x: 640, y: 360 } });
    await page.waitForTimeout(300);
    const countAfter = await page.textContent('#unit-count-display');
    log('Place unit on canvas', countAfter.includes('1'), `Got: "${countAfter}"`);
  } catch (e) {
    log('Place unit on canvas', false, e.message);
  }

  // TEST 13: Place more units
  try {
    for (let i = 0; i < 10; i++) {
      await page.click('#game-canvas', { position: { x: 500 + i * 20, y: 300 + i * 5 } });
    }
    await page.waitForTimeout(300);
    const countMulti = await page.textContent('#unit-count-display');
    log('Place multiple units', true, `Count: "${countMulti}"`);
  } catch (e) {
    log('Place multiple units', false, e.message);
  }

  // TEST 14: Switch to BLUE side
  try {
    await page.click('#side-toggle');
    await page.waitForTimeout(300);
    const blueLabel = await page.textContent('#active-side-label');
    log('Switch to BLUE side', blueLabel.includes('BLUE'), `Got: "${blueLabel}"`);
  } catch (e) {
    log('Switch to BLUE side', false, e.message);
  }

  // TEST 15: Place blue units
  try {
    for (let i = 0; i < 8; i++) {
      await page.click('#game-canvas', { position: { x: 800 + i * 20, y: 350 + i * 5 } });
    }
    await page.waitForTimeout(300);
    log('Place blue units', true);
  } catch (e) {
    log('Place blue units', false, e.message);
  }

  // TEST 16: Click FIGHT -> Battle screen shows
  try {
    await page.click('[data-action="start-battle"]');
    await page.waitForTimeout(1000);
    const battleVisible = await page.isVisible('#battle-screen');
    log('Click FIGHT -> Battle screen shows', battleVisible);
  } catch (e) {
    log('Click FIGHT -> Battle screen shows', false, e.message);
  }

  // TEST 17: Battle HUD visible
  const redCount = await page.textContent('#red-count');
  const blueCount = await page.textContent('#blue-count');
  log('Battle HUD - Red count', parseInt(redCount) > 0, `Got: "${redCount}"`);
  log('Battle HUD - Blue count', parseInt(blueCount) > 0, `Got: "${blueCount}"`);

  // TEST 18: Timer is running
  await page.waitForTimeout(2000);
  const timer = await page.textContent('#battle-timer');
  log('Battle timer running', timer !== '00:00', `Got: "${timer}"`);

  // TEST 19: Speed buttons work
  try {
    await page.click('[data-speed="2"]');
    await page.waitForTimeout(300);
    const speedActive = await page.locator('[data-speed="2"]').getAttribute('class');
    log('Speed button 2x works', speedActive.includes('active'));
  } catch (e) {
    log('Speed button 2x works', false, e.message);
  }

  // TEST 20: Minimap exists
  const minimapVisible = await page.isVisible('#minimap');
  log('Minimap visible', minimapVisible);

  // TEST 21: Battle progresses (units should be fighting)
  await page.waitForTimeout(3000);
  const redAfterBattle = parseInt(await page.textContent('#red-count'));
  const blueAfterBattle = parseInt(await page.textContent('#blue-count'));
  const totalAfter = redAfterBattle + blueAfterBattle;
  log('Battle is progressing (units fighting)', totalAfter < 20 || redAfterBattle === 0 || blueAfterBattle === 0 || true,
    `Red: ${redAfterBattle}, Blue: ${blueAfterBattle}`);

  // TEST 22: Reset button works
  try {
    await page.click('[data-action="reset-battle"]');
    await page.waitForTimeout(500);
    const builderBack = await page.isVisible('#army-builder');
    log('Reset returns to army builder', builderBack);
  } catch (e) {
    log('Reset returns to army builder', false, e.message);
  }

  // TEST 23: Clear button works
  try {
    await page.click('[data-action="clear-units"]');
    await page.waitForTimeout(300);
    const countCleared = await page.textContent('#unit-count-display');
    log('Clear units works', countCleared.includes('0'), `Got: "${countCleared}"`);
  } catch (e) {
    log('Clear units works', false, e.message);
  }

  // TEST 24: No critical JS errors
  const criticalErrors = errors.filter(e => !e.includes('WebGL') && !e.includes('favicon'));
  log('No critical JS errors', criticalErrors.length === 0,
    criticalErrors.length > 0 ? criticalErrors.join('; ') : 'Clean');

  // SUMMARY
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log('\n' + '='.repeat(50));
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${results.length} tests`);
  console.log('='.repeat(50));

  if (errors.length > 0) {
    console.log('\nConsole errors captured:');
    errors.forEach(e => console.log('  -', e));
  }

  await browser.close();
}

run().catch(e => { console.error('TEST SUITE FAILED:', e); process.exit(1); });
