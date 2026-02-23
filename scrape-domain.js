const { chromium } = require('playwright');

(async () => {

  const domain = process.argv[2];

  if (!domain) {
    console.log("Gunakan: node scrape.js namadomain.com");
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  console.log("Scraping:", domain);

  try {
    await page.goto(`https://www.whois.com/whois/${domain}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    await page.waitForSelector('.whois-data', { timeout: 15000 });

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

    console.log(JSON.stringify({
      domain,
      success: true,
      data
    }, null, 2));

  } catch (err) {
    console.log(JSON.stringify({
      domain,
      success: false,
      error: err.message
    }, null, 2));
  }

  await browser.close();

})();

