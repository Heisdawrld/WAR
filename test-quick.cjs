const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const e = [];
  p.on('pageerror', x => e.push(x.message));
  
  await p.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 15000 });
  console.log('1. Page loads: PASS');
  console.log('2. Title:', await p.title());
  
  await p.waitForSelector('#main-menu:not(.hidden)', { timeout: 10000 });
  console.log('3. Menu appears: PASS');
  
  await p.click('[data-action="quick-battle"]');
  await p.waitForTimeout(500);
  console.log('4. Builder shows:', await p.isVisible('#army-builder'));
  console.log('5. Unit cards:', await p.locator('.unit-card').count());
  console.log('6. Formations:', await p.locator('.formation-btn').count());
  
  await p.click('#game-canvas', { position: { x: 640, y: 360 } });
  await p.waitForTimeout(200);
  await p.click('#game-canvas', { position: { x: 660, y: 350 } });
  await p.click('#game-canvas', { position: { x: 680, y: 340 } });
  console.log('7. Units placed:', await p.textContent('#unit-count-display'));
  
  await p.click('#side-toggle');
  await p.waitForTimeout(200);
  console.log('8. Side switch:', await p.textContent('#active-side-label'));
  
  await p.click('#game-canvas', { position: { x: 800, y: 360 } });
  await p.click('#game-canvas', { position: { x: 820, y: 350 } });
  await p.click('#game-canvas', { position: { x: 840, y: 340 } });
  
  await p.click('[data-action="start-battle"]');
  await p.waitForTimeout(500);
  console.log('9. Battle screen:', await p.isVisible('#battle-screen'));
  console.log('10. Red count:', await p.textContent('#red-count'));
  console.log('11. Blue count:', await p.textContent('#blue-count'));
  
  await p.waitForTimeout(2000);
  console.log('12. Timer:', await p.textContent('#battle-timer'));
  
  await p.click('[data-speed="2"]');
  console.log('13. Speed btn:', (await p.locator('[data-speed="2"]').getAttribute('class')).includes('active'));
  console.log('14. Minimap:', await p.isVisible('#minimap'));
  
  await p.click('[data-action="reset-battle"]');
  await p.waitForTimeout(500);
  console.log('15. Reset:', await p.isVisible('#army-builder'));
  
  console.log('16. JS errors:', e.length === 0 ? 'Clean' : e.join('; '));
  console.log('\n=== ALL TESTS COMPLETE ===');
  await b.close();
})().catch(x => { console.error('FATAL:', x.message); process.exit(1); });
