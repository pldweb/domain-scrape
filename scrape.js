const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false
  });

  const page = await browser.newPage();

  await page.goto('https://www.whois.com/whois/rinkwebstudio.com', {
    waitUntil: 'networkidle'
  });

  await page.waitForSelector('.whois-data');

  const data = await page.evaluate(() => {
    const rows = document.querySelectorAll('.df-row');
    const result = {};

    rows.forEach(row => {
      const label = row.querySelector('.df-label')?.innerText.trim();
      const value = row.querySelector('.df-value')?.innerText.trim();
      if (label && value) {
        result[label.replace(':','')] = value;
      }
    });

    return result;
  });

  console.log(data);

  await browser.close();
})();

