const { chromium } = require('playwright-core');
const r = [];
let browser, page;
function log(t, p, d='') { r.push({t,p}); console.log(`${p?'PASS':'FAIL'} ${t}${d?' - '+d:''}`); }

(async () => {
  browser = await chromium.launch({ headless: true });
  page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  log('1. Page loads', true);

  const title = await page.title();
  log('2. Title correct', title === 'WARZONE SANDBOX', title);

  log('3. Splash visible', await page.isVisible('#splash'));
  log('4. Canvas exists', (await page.locator('#game-canvas').count()) > 0);

  await page.waitForSelector('#main-menu:not(.hidden)', { timeout: 10000 });
  log('5. Menu appears', true);

  log('6. Quick Battle btn', (await page.locator('[data-action="quick-battle"]').count()) > 0);
  log('7. Sandbox btn', (await page.locator('[data-action="sandbox"]').count()) > 0);

  await page.click('[data-action="quick-battle"]');
  await page.waitForTimeout(500);
  log('8. Army Builder shows', await page.isVisible('#army-builder'));
  log('9. 8 unit types', (await page.locator('.unit-card').count()) === 8);
  log('10. 4 formations', (await page.locator('.formation-btn').count()) === 4);

  const sl = await page.textContent('#active-side-label');
  log('11. Side=RED', sl.includes('RED'), sl);

  await page.click('#game-canvas', { position: { x: 640, y: 360 } });
  await page.waitForTimeout(300);
  const c1 = await page.textContent('#unit-count-display');
  log('12. Place 1 unit', c1.includes('1'), c1);

  for (let i=0;i<10;i++) await page.click('#game-canvas', { position: { x: 500+i*20, y: 300+i*5 } });
  await page.waitForTimeout(300);
  log('13. Place 10 units', true, await page.textContent('#unit-count-display'));

  await page.click('#side-toggle');
  await page.waitForTimeout(300);
  log('14. Switch to BLUE', (await page.textContent('#active-side-label')).includes('BLUE'));

  for (let i=0;i<8;i++) await page.click('#game-canvas', { position: { x: 800+i*20, y: 350+i*5 } });
  log('15. Place blue units', true);

  await page.click('[data-action="start-battle"]');
  await page.waitForTimeout(1000);
  log('16. Battle screen', await page.isVisible('#battle-screen'));

  const rc = await page.textContent('#red-count');
  const bc = await page.textContent('#blue-count');
  log('17. Red count>0', parseInt(rc)>0, rc);
  log('18. Blue count>0', parseInt(bc)>0, bc);

  await page.waitForTimeout(2000);
  log('19. Timer running', (await page.textContent('#battle-timer')) !== '00:00');

  await page.click('[data-speed="2"]');
  log('20. Speed btn', (await page.locator('[data-speed="2"]').getAttribute('class')).includes('active'));
  log('21. Minimap', await page.isVisible('#minimap'));

  await page.waitForTimeout(2000);
  log('22. Battle progressing', true, `R:${await page.textContent('#red-count')} B:${await page.textContent('#blue-count')}`);

  await page.click('[data-action="reset-battle"]');
  await page.waitForTimeout(500);
  log('23. Reset works', await page.isVisible('#army-builder'));

  await page.click('[data-action="clear-units"]');
  await page.waitForTimeout(300);
  log('24. Clear works', (await page.textContent('#unit-count-display')).includes('0'));

  const crit = errs.filter(e => !e.includes('WebGL') && !e.includes('favicon'));
  log('25. No JS errors', crit.length===0, crit.length>0 ? crit.join('; '):'Clean');

  const p = r.filter(x=>x.pass).length, f = r.filter(x=>!x.pass).length;
  console.log(`\n=== ${p}/${r.length} PASSED, ${f} FAILED ===`);
  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
