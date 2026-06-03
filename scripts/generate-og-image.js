import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 웹폰트(Single Day)가 로드된 뒤 캡처하도록 보장 — 폰트 미적용 캡처 방지.
async function captureFromHtml(page, htmlFile, outFile) {
    await page.goto(`file:${join(__dirname, '..', htmlFile)}`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.setViewport({ width: 1200, height: 1200 });
    await page.screenshot({ path: join(__dirname, '..', outFile), type: 'png' });
}

async function generateOGImage() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // 메인 OG 이미지 (먀)
    await captureFromHtml(page, 'static/og-image.html', 'static/og-image.png');

    // /play 게임 전용 OG 이미지 (사랑해 폭발)
    await captureFromHtml(page, 'static/og-play.html', 'static/og-play.png');

    // Favicon 생성 (메인 og-image.html 재사용)
    await page.goto(`file:${join(__dirname, '../static/og-image.html')}`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.setViewport({ width: 32, height: 32, deviceScaleFactor: 2 });
    await page.screenshot({
        path: join(__dirname, '../static/favicon.png'),
        type: 'png',
        clip: { x: 0, y: 0, width: 32, height: 32 }
    });

    await browser.close();
}

generateOGImage().catch(console.error);
