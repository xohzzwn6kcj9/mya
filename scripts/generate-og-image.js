import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateOGImage() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // HTML 파일 로드
    await page.goto(`file:${join(__dirname, '../static/og-image.html')}`);
    
    // OG 이미지 생성
    await page.setViewport({
        width: 1200,
        height: 1200
    });
    
    await page.screenshot({
        path: join(__dirname, '../static/og-image.png'),
        type: 'png'
    });

    // Favicon 생성
    await page.setViewport({
        width: 32,
        height: 32,
        deviceScaleFactor: 2
    });

    await page.screenshot({
        path: join(__dirname, '../static/favicon.png'),
        type: 'png',
        clip: {
            x: 0,
            y: 0,
            width: 32,
            height: 32
        }
    });
    
    await browser.close();
}

generateOGImage().catch(console.error); 