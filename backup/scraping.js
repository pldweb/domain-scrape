const { chromium } = require('playwright');
const fs = require('fs');

(async () => {

  const domains = [
    "travelsystem10.my.id",
    "travelsystem25.my.id",
    "rinkwebstudio.com"
  ];

  const browser = await chromium.launch({
    headless: false
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

      results.push({
        domain,
        success: true,
        data
      });

    } catch (err) {
      console.log("Failed:", domain);
      results.push({
        domain,
        success: false,
        error: err.message
      });
    }

    // delay 5 detik biar tidak cepat diblokir
    await page.waitForTimeout(5000);
  }

  await browser.close();

  // simpan ke file JSON
  fs.writeFileSync('result.json', JSON.stringify(results, null, 2));

  console.log("Selesai. Data disimpan di result.json");

})();

