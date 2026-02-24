const express = require('express');
const { chromium } = require('playwright');
const { OpenAI } = require('openai');

const app = express();
const PORT = 3000;

// Initialize SumoPod AI Client
const openai = new OpenAI({
  apiKey: 'sk-AflQ1n3CaZQuN7vvCUjkjQ', // API Key SumoPod kamu
  baseURL: 'https://ai.sumopod.com/v1'
});

let browser;

// Nyalakan browser satu kali saat server mulai
async function initBrowser() {
  browser = await chromium.launch({ headless: true });
  console.log("Browser Engine Active - RinkWebStudio AI Scraper");
}

app.get('/reviews-ai', async (req, res) => {
  const placeUrl = req.query.url;

  if (!placeUrl) return res.status(400).json({ success: false, error: "Link Maps wajib ada." });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Optimasi: Blokir Gambar, Font, dan CSS agar loading sangat cepat
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'font', 'stylesheet', 'media'].includes(type)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  try {
    console.log(`Membuka: ${placeUrl}`);
    await page.goto(placeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // --- TAHAP 1: AUTO SCROLL TANPA SELECTOR ---
    // Kita scroll body atau window secara global
    console.log("Scrolling halaman...");
    await page.evaluate(() => {
        window.scrollBy(0, 2000);
    });
    await page.waitForTimeout(3000); // Tunggu konten dirender

    // --- TAHAP 2: GRAB SEMUA TEKS (STRATEGI UTAMA) ---
    // Kita ambil semua teks yang terlihat di layar, tanpa peduli selector class
    const rawText = await page.evaluate(() => {
      // Mengambil innerText dari elemen 'main' atau seluruh body
      const mainContent = document.querySelector('[role="main"]') || document.body;
      return mainContent.innerText;
    });

    // --- TAHAP 3: AI EXTRACTION ---
    console.log("AI sedang membedakan data review...");
    const aiResponse = await openai.chat.completions.create({
      model: 'seed-2-0-mini-free',
      messages: [
        { 
          role: 'system', 
          content: `Kamu adalah asisten pengolah data. 
          Tugasmu adalah menyaring teks mentah dari Google Maps. 
          Temukan ulasan pengguna dan ubah menjadi JSON array.
          Setiap ulasan harus memiliki: author, rating, comment, dan posted_at.
          Abaikan informasi toko, menu navigasi, dan balasan dari pemilik toko.
          Wajib kembalikan dalam format JSON dengan root key "reviews".` 
        },
        { 
          role: 'user', 
          content: `Teks Mentah: \n\n ${rawText}` 
        }
      ],
      response_format: { type: "json_object" }
    });

    const aiContent = JSON.parse(aiResponse.choices[0].message.content);

    res.json({
      success: true,
      total: aiContent.reviews ? aiContent.reviews.length : 0,
      data: aiContent.reviews || []
    });

  } catch (err) {
    console.error("Scraper Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    await context.close();
  }
});

initBrowser().then(() => {
  app.listen(PORT, () => console.log(`API Review AI RinkWebStudio jalan di port ${PORT}`));
});
