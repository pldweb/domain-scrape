const { chromium } = require('playwright');
const fs = require('fs');
const getDomains = require('./cloudflare');

(async () => {

  const domains = await getDomains();

  console.log("Total domain:", domains.length);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  const results = [];

  for (const domain of domains) {
    console.log("Scraping:", domain);

    try {
      await page.goto(`https://www.whois.com/whois/${domain}`, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      await page.waitForSelector('.whois-data', { timeout: 60000 });

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

      results.push({ domain, success: true, data });

    } catch (err) {
      results.push({ domain, success: false, error: err.message });
    }

    await page.waitForTimeout(7000); // delay biar ga diblokir
  }

  await browser.close();

  fs.writeFileSync('result.json', JSON.stringify(results, null, 2));

  console.log("Selesai.");

})();

