import puppeteer from 'puppeteer-core';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function runAudit() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  
  // Track console and network
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', err => {
    consoleLogs.push({ type: 'pageerror', text: err.message });
  });

  console.log('=== 1. Testing Mobile Viewport (390x844) ===');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

  // 1a. Horizontal overflow
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  console.log(`Mobile dimensions: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
  if (scrollWidth > clientWidth) {
    console.warn(`[BUG] Horizontal overflow detected on mobile: ${scrollWidth} > ${clientWidth}`);
  } else {
    console.log('✓ No horizontal overflow at 390px');
  }

  // 1b. Navigate to Ask tab
  const navButtons = await page.$$('nav button');
  if (navButtons.length >= 4) {
    await navButtons[3].click();
    await new Promise(r => setTimeout(r, 1200));
  }

  // 1c. Test Off-Topic Query (Should NOT match anything, should say Not Found)
  console.log('\n--- Testing Off-Topic Query: "How to bake a chocolate cake in an oven?" ---');
  let input = await page.$('input[type="text"]');
  if (input) {
    await input.type('How to bake a chocolate cake in an oven?');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 3500));

    const responses = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.whitespace-pre-wrap')).map(el => el.textContent);
    });
    console.log('Assistant Response for Off-Topic Query:');
    console.log(responses[responses.length - 1]);

    const citations = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.line-clamp-3')).map(el => el.textContent);
    });
    console.log(`Citations returned for Off-Topic Query: ${citations.length}`);
    if (citations.length > 0) {
      console.warn(`[BUG] False positive citations returned for completely irrelevant query: ${citations.length} citations returned!`);
    }
  }

  // 1d. Test Deep LLM WebGPU Toggle behavior
  console.log('\n--- Testing Deep LLM Toggle on Mobile (WebGPU check) ---');
  const allButtons = await page.$$('button');
  for (const b of allButtons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text.includes('Deep LLM')) {
      const title = await page.evaluate(el => el.getAttribute('title'), b);
      console.log('Deep LLM button title attribute:', title);
      await b.click();
      console.log('Clicked Deep LLM button');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));

  // Ask question with Deep LLM mode active
  input = await page.$('input[type="text"]');
  if (input) {
    await input.type('What is MQTT?');
    await page.keyboard.press('Enter');
    console.log('Submitted "What is MQTT?" with Deep LLM active...');
    await new Promise(r => setTimeout(r, 4000));

    const responses = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.whitespace-pre-wrap')).map(el => el.textContent);
    });
    console.log('Assistant Response with Deep LLM mode:');
    console.log(responses[responses.length - 1]);
  }

  // 1e. Test Video Timestamp seek button
  console.log('\n--- Testing Video Timestamp citation seek button ---');
  const playButtons = await page.$$('button');
  let playClicked = false;
  for (const pb of playButtons) {
    const text = await page.evaluate(el => el.textContent, pb);
    if (text.includes('Play at')) {
      console.log(`Found video seek button: "${text.trim()}", clicking...`);
      await pb.click();
      playClicked = true;
      break;
    }
  }
  if (playClicked) {
    await new Promise(r => setTimeout(r, 1500));
    const iframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe ? iframe.getAttribute('src') : null;
    });
    console.log('Active YouTube iframe src:', iframeSrc);
  } else {
    console.log('No video Play button was visible in the current results.');
  }

  // 1f. Test "Ask this project" flow from Projects tab
  console.log('\n--- Testing "Ask this project" Scope Flow ---');
  if (navButtons.length >= 3) {
    await navButtons[2].click(); // Projects tab
    await new Promise(r => setTimeout(r, 1000));

    // Click on Project 1 card
    const projectCards = await page.$$('.cursor-pointer');
    if (projectCards.length > 0) {
      await projectCards[0].click();
      await new Promise(r => setTimeout(r, 800));

      // Find "Ask Assistant about this Project" button
      const modalButtons = await page.$$('button');
      let askProjectClicked = false;
      for (const mb of modalButtons) {
        const text = await page.evaluate(el => el.textContent, mb);
        if (text && text.includes('Ask Assistant about this Project')) {
          console.log('Found "Ask Assistant about this Project" button, clicking...');
          await mb.click();
          askProjectClicked = true;
          break;
        }
      }

      if (askProjectClicked) {
        await new Promise(r => setTimeout(r, 1000));
        // Check if we are navigated to Ask page with scoped project banner
        const scopeText = await page.evaluate(() => {
          const banner = document.querySelector('.truncate.text-slate-200');
          return banner ? banner.textContent : null;
        });
        console.log('Scoped project banner text in Ask Page:', scopeText);

        // Click first suggested prompt: "What are the hardware requirements for Smart Temperature Monitor?"
        const suggestionBtns = await page.$$('button');
        for (const sb of suggestionBtns) {
          const stext = await page.evaluate(el => el.textContent, sb);
          if (stext && stext.includes('hardware requirements')) {
            console.log(`Clicking scoped suggestion: "${stext.trim()}"`);
            await sb.click();
            await new Promise(r => setTimeout(r, 3500));
            break;
          }
        }

        const scopedResp = await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('.whitespace-pre-wrap'));
          return items.map(el => el.textContent);
        });
        console.log('Scoped response:', scopedResp[scopedResp.length - 1]);
        
        const scopedCitations = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('.line-clamp-3')).map(el => el.textContent);
        });
        console.log(`Scoped citations count: ${scopedCitations.length}`);
      }
    }
  }

  // 2. Desktop Viewport (1280x800)
  console.log('\n=== 2. Testing Desktop Viewport (1280x800) ===');
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise(r => setTimeout(r, 500));
  const mainMetrics = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return null;
    const rect = main.getBoundingClientRect();
    return { width: rect.width, left: rect.left, right: rect.right, windowWidth: window.innerWidth };
  });
  console.log('Desktop main container layout metrics:', mainMetrics);

  console.log('\n=== Captured Console Logs during audit ===');
  consoleLogs.forEach(l => {
    if (l.type === 'error' || l.type === 'pageerror' || l.type === 'warning') {
      console.log(`[${l.type.toUpperCase()}] ${l.text}`);
    }
  });

  await browser.close();
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
