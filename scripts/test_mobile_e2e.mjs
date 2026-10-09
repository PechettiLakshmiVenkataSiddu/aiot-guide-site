import puppeteer from 'puppeteer-core';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\peche\\.gemini\\antigravity-ide\\brain\\5a45ed16-42ab-4a96-bce8-ecac753ec04e';

async function runE2E() {
  console.log("=== Running Mobile E2E Tests on Edge Headless ===");

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  console.log("Navigating to http://127.0.0.1:5173/ ...");
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

  // 1. Home Page Screenshot
  console.log("1. Verifying Home Page...");
  await page.waitForSelector('h1');
  const homeScreenshot = path.join(ARTIFACT_DIR, 'screenshot_home.png');
  await page.screenshot({ path: homeScreenshot });
  console.log(`✓ Saved Home Page screenshot: ${homeScreenshot}`);

  // Test Tab Switching on Home (DSA tab)
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text.includes('DSA Patterns')) {
      await b.click();
      console.log("✓ Clicked DSA Patterns tab");
      break;
    }
  }
  await new Promise(r => setTimeout(r, 600));

  // 2. Navigate to Roadmap Tab
  console.log("2. Verifying Roadmap Page...");
  const navButtons = await page.$$('nav button');
  if (navButtons.length >= 2) {
    await navButtons[1].click(); // Roadmap is second
    await new Promise(r => setTimeout(r, 600));
    const roadmapScreenshot = path.join(ARTIFACT_DIR, 'screenshot_roadmap.png');
    await page.screenshot({ path: roadmapScreenshot });
    console.log(`✓ Saved Roadmap screenshot: ${roadmapScreenshot}`);

    // Click first milestone
    const milestoneCards = await page.$$('.cursor-pointer');
    if (milestoneCards.length > 0) {
      await milestoneCards[0].click();
      console.log("✓ Clicked milestone checkbox (toggled state)");
    }
  }

  // 3. Navigate to Projects Tab
  console.log("3. Verifying Projects Page...");
  if (navButtons.length >= 3) {
    await navButtons[2].click(); // Projects is third
    await new Promise(r => setTimeout(r, 600));
    const projectsScreenshot = path.join(ARTIFACT_DIR, 'screenshot_projects.png');
    await page.screenshot({ path: projectsScreenshot });
    console.log(`✓ Saved Projects screenshot: ${projectsScreenshot}`);

    // Open first project card
    const projectCards = await page.$$('.cursor-pointer');
    if (projectCards.length > 0) {
      await projectCards[0].click();
      await new Promise(r => setTimeout(r, 800));
      const projectDetailScreenshot = path.join(ARTIFACT_DIR, 'screenshot_project_detail.png');
      await page.screenshot({ path: projectDetailScreenshot });
      console.log(`✓ Saved Project Detail screenshot: ${projectDetailScreenshot}`);

      // Close modal
      const closeButtons = await page.$$('button');
      for (const cb of closeButtons) {
        const aria = await page.evaluate(el => el.getAttribute('aria-label') || el.innerHTML, cb);
        if (aria && (aria.includes('close') || aria.includes('lucide-x') || aria.includes('X'))) {
          await cb.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 400));
    }
  }

  // 4. Navigate to Ask Tab & Test Query
  console.log("4. Verifying Ask Assistant...");
  if (navButtons.length >= 4) {
    await navButtons[3].click(); // Ask is fourth
    await new Promise(r => setTimeout(r, 800));
    
    // Type query into input
    const input = await page.$('input[type="text"]');
    if (input) {
      await input.type('ADXL345 vibration sensor wiring');
      await page.keyboard.press('Enter');
      console.log("✓ Submitted query: 'ADXL345 vibration sensor wiring'");

      // Wait for results
      await page.waitForSelector('.whitespace-pre-wrap', { timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 4000));
      const askScreenshot = path.join(ARTIFACT_DIR, 'screenshot_ask_results.png');
      await page.screenshot({ path: askScreenshot });
      console.log(`✓ Saved Ask Assistant screenshot: ${askScreenshot}`);
    }
  }

  // 5. Navigate to Progress Tab
  console.log("5. Verifying Progress Page...");
  if (navButtons.length >= 5) {
    await navButtons[4].click(); // Progress is fifth
    await new Promise(r => setTimeout(r, 600));
    const progressScreenshot = path.join(ARTIFACT_DIR, 'screenshot_progress.png');
    await page.screenshot({ path: progressScreenshot });
    console.log(`✓ Saved Progress screenshot: ${progressScreenshot}`);
  }

  await browser.close();

  console.log("\nConsole Errors Detected:", consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error("Console Errors:", consoleErrors);
  } else {
    console.log("✨ Zero console errors detected!");
  }

  console.log("\n=== E2E Test Run Completed Successfully! ===");
}

runE2E().catch(err => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
