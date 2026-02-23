const axios = require('axios');
const fs = require('fs');
const { chromium } = require('playwright');

const CF_TOKEN = 'ZgvCuaqhUkrm7dNeE_5pyxB3XZeLyEojomt1oS9c';

async function fetchDomainsFromCloudflare() {
  const response = await axios.get(
    'https://api.cloudflare.com/client/v4/zones',
    {
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.result.map(zone => zone.name).sort();
}

function readLocalDomains() {
  if (!fs.existsSync('domains.json')) return [];
  return JSON.parse(fs.readFileSync('domains.json')).sort();
}

function saveDomains(domains) {
  fs.writeFileSync('domains.json', JSON.stringify(domains, null, 2));
}

function arraysEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function scrapeWhois(domains) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });

  const results = [];

  for (const domain of domains) {
    const page = await browser.newPage();
    console.log("Scraping:", domain);

    try {
      await page.goto(`https://www.whois.com/whois/${domain}`, {
        waitUntil: 'domcontentloaded',
        timeout: 2000
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

      results.push({ domain, success: true, data });

    } catch (err) {
      results.push({ domain, success: false, error: err.message });
    }

    await page.close();
    await new Promise(r => setTimeout(r, 2000));
  }

  await browser.close();

  fs.writeFileSync('whois-result.json', JSON.stringify(results, null, 2));
  console.log("Scraping selesai.");
}

(async () => {

  console.log("Ambil domain dari Cloudflare...");
  const apiDomains = await fetchDomainsFromCloudflare();
  const localDomains = readLocalDomains();

  if (!arraysEqual(apiDomains, localDomains)) {
    console.log("Domain berubah. Update domains.json");
    saveDomains(apiDomains);
  } else {
    console.log("Tidak ada perubahan domain.");
  }

  const domainsToScrape = readLocalDomains();

  console.log("Total domain:", domainsToScrape.length);

  await scrapeWhois(domainsToScrape);

})();

