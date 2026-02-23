const express = require('express');
const { chromium } = require('playwright');
const app = express();
const PORT = 3000;

app.get('/check/:domain', async (req, res) => {
  const domain = req.params.domain;
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

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

    res.json({
      domain,
      success: true,
      data
    });

  } catch (err) {
    res.status(500).json({
      domain,
      success: false,
      error: err.message
    });
  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
