const express = require('express');
const { chromium } = require('playwright');
const { OpenAI } = require('openai');

const app = express();
const PORT = 3000;

// Initialize SumoPod AI Client
const openai = new OpenAI({
  apiKey: 'sk-AflQ1n3CaZQuN7vvCUjkjQ', // Key kamu sudah terpasang
  baseURL: 'https://ai.sumopod.com/v1'
});

let browser;

async function initBrowser() {
  browser = await chromium.launch({ headless: true });
  console.log("Browser Engine Active - RinkWebStudio AI Scraper");
}

app.get('/reviews-ai', async (req, res) => {
  const placeUrl = req.query.url;

  if (!placeUrl) return res.status(400).json({ success: false, error: "Linknya mana?" });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Optimasi: Blokir CSS dan Image agar hemat bandwidth & cepat
  await page.route('**/*', (route) => {
    if (['image', 'font', 'stylesheet', 'media'].includes(route.request().resourceType())) {
      route.abort();
    } else {
      route.continue();
    }
  });

  try {
    console.log(`Membuka URL: ${placeUrl}`);
    // Pakai networkidle agar semua teks ter-load sempurna
    await page.goto(placeUrl, { waitUntil: 'networkidle', timeout: 60000 });

    // Tunggu elemen ulasan muncul (selector .d4r55 untuk nama)
    // Gunakan try-catch kecil agar tidak langsung crash jika tidak ada review
    try {
      await page.waitForSelector('.d4r55', { timeout: 15000 });
    } catch (e) {
      console.log("Elemen .d4r55 tidak ditemukan, mungkin halaman lambat atau tidak ada review.");
    }

    // --- TAHAP 1: AUTO SCROLL ---
    await page.evaluate(() => {
      const scrollable = document.querySelector('.DxyBCb') || window;
      scrollable.scrollBy(0, 1500);
    });
    await page.waitForTimeout(2000);

    // --- TAHAP 2: AMBIL SEMUA TEKS ---
    const rawText = await page.evaluate(() => {
      // Ambil teks dari kontainer utama .m6QErb agar AI tidak pusing baca header/footer
      const container = document.querySelector('.m6QErb');
      return container ? container.innerText : document.body.innerText;
    });

    // --- TAHAP 3: PROSES AI ---
    console.log("Mengirim data ke AI SumoPod...");
    const aiResponse = await openai.chat.completions.create({
      model: 'seed-2-0-mini-free',
      messages: [
        { 
          role: 'system', 
          content: 'Kamu adalah pakar ekstraksi data. Tugasmu mencari ulasan pengguna dari teks mentah Google Maps dan mengubahnya menjadi JSON. Wajib berikan root object dengan key "reviews" yang berisi array.' 
        },
        { 
          role: 'user', 
          content: `Ekstrak ulasan (author, rating, comment, posted_at) dari teks berikut ini: \n\n ${rawText}` 
        }
      ],
      response_format: { type: "json_object" }
    });

    // Parsing hasil AI
    const aiContent = JSON.parse(aiResponse.choices[0].message.content);
    
    // Standarisasi output agar selalu array
    const finalData = aiContent.reviews || aiContent;

    res.json({
      success: true,
      total: Array.isArray(finalData) ? finalData.length : 0,
      data: finalData
    });

  } catch (err) {
    console.error("Error Detail:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    // SANGAT PENTING: Tutup context agar RAM tidak bocor
    await context.close();
  }
});

initBrowser().then(() => {
  app.listen(PORT, () => console.log(`AI Scraper RinkWebStudio di port ${PORT}`));
});
