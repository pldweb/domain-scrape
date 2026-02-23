const express = require('express');
const { chromium } = require('playwright');
const app = express();
const PORT = 3000;

let browser; // Kita taruh di luar agar tidak mati-nyala

// Fungsi untuk menyalakan browser saat server start
async function initBrowser() {
  browser = await chromium.launch({ headless: true });
  console.log("Browser Ready!");
}

app.get('/check/:domain', async (req, res) => {
  const domain = req.params.domain;
  
  // Gunakan browser yang sudah ada, buat context (tab) baru saja
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 ...', // Gunakan UA yang sama seperti sebelumnya
  });
  const page = await context.newPage();

  // STRATEGI KILAT: Blokir gambar, font, dan stylesheet
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'font', 'stylesheet', 'media'].includes(type)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  try {
    // Gunakan 'domcontentloaded' karena kita tidak butuh nunggu gambar/iklan selesai
    await page.goto(`https://www.whois.com/whois/${domain}`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });

    await page.waitForSelector('.whois-data', { timeout: 5000 });

    const data = await page.evaluate(() => {
      const rows = document.querySelectorAll('.df-row');
      const result = {};
      rows.forEach(row => {
        const label = row.querySelector('.df-label')?.innerText.trim();
        const value = row.querySelector('.df-value')?.innerText.trim();
        if (label && value) result[label.replace(':', '')] = value;
      });
      return result;
    });

    res.json({ domain, success: true, data });

  } catch (err) {
    res.status(500).json({ domain, success: false, error: err.message });
  } finally {
    // Tutup TAB (context) saja, jangan tutup BROWSER-nya
    await context.close();
  }
});

// Jalankan browser dulu baru buka server
initBrowser().then(() => {
  app.listen(PORT, () => console.log(`API Cepat RinkWebStudio di port ${PORT}`));
});
