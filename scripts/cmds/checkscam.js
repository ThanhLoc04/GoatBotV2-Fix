const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const dataFile = path.join(__dirname, 'data', 'datacheckscam.json');

function loadData() {
    if (!fs.existsSync(dataFile)) return {};
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function saveData(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

let autoCheckEnabled = loadData();

class checkscam {
    constructor(a) {
        this.config = a;
    }

    async onStart() {
        // Bắt buộc phải có để tránh lỗi
    }

    async onChat({ message: { reply }, event }) {
        const { body, threadID } = event;
        if (!body) return;

        if (body.toLowerCase() === '-checkscam') {
            autoCheckEnabled[threadID] = !autoCheckEnabled[threadID];
            saveData(autoCheckEnabled);
            reply(autoCheckEnabled[threadID]
                ? '✅ Auto-check scam đã BẬT cho box này.'
                : '❌ Auto-check scam đã TẮT cho box này.'
            );
            return;
        }

        if (!autoCheckEnabled[threadID]) return;

        const phoneRegex = /0\d{9}/g;
        const facebookRegex = /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com|m\.facebook\.com)\/[^\s]+/gi;
        const uniqueItems = [...new Set([...(body.match(phoneRegex) || []), ...(body.match(facebookRegex) || [])])];

        if (!uniqueItems.length) return;

        reply(`🔍 Phát hiện ${uniqueItems.length} item cần check scam:\n${uniqueItems.map(i => `• ${i}`).join('\n')}\n\n⏳ Đang kiểm tra...`);

        for (let i = 0; i < uniqueItems.length; i++) {
            const item = uniqueItems[i];
            try {
                const result = await checkScamDirect(item);
                reply(result ? `📊 KẾT QUẢ CHO "${item}":\n\n${result}` : `❌ Không thể check scam cho "${item}"`);
                if (i < uniqueItems.length - 1) await new Promise(r => setTimeout(r, 2000));
            } catch (error) {
                console.error(`Lỗi khi check scam cho ${item}:`, error);
                reply(`💥 Lỗi khi check scam cho "${item}": ${error.message}`);
            }
        }

        reply(`✅ Đã hoàn thành check scam cho tất cả ${uniqueItems.length} item!`);
    }
}

module.exports = new checkscam({
    name: 'checkscam',
    version: '30.11.2006',
    author: 'Quất ',
    role: 0,
    prefix: false,
    guide: {},
    countDown: 0,
    category: 'category',
    longDescription: {}
});

async function checkScamDirect(query) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
        ],
        protocolTimeout: 60000
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const searchUrl = `https://checkscam.vn/?qh_ss=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        let additionalInfo = '';
        try {
            const pageText = await page.evaluate(() => document.body.textContent);
            const escQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const warningMatch = pageText.match(new RegExp(`Có (\\d+) cảnh báo liên quan đến[^\\d]*"${escQuery}"`, 'i'));
            const scamMatch = pageText.match(new RegExp(`Có (\\d+) vụ lừa đảo liên quan đến[^\\d]*"${escQuery}"`, 'i'));

            if (warningMatch || scamMatch) {
                const match = warningMatch || scamMatch;
                const warningCount = parseInt(match[1]);
                const warningType = warningMatch ? 'cảnh báo' : 'vụ lừa đảo';

                if (warningCount === 0) {
                    additionalInfo = `✅ Không có ${warningType} nào liên quan.`;
                } else {
                    additionalInfo = `⚠️ Có ${warningCount} ${warningType} liên quan.`;
                }
            } else {
                additionalInfo = `❓ Không có thông tin rõ ràng.`;
            }
        } catch {
            additionalInfo = `❓ Không thể truy xuất thông tin.`;
        }

        return additionalInfo.trim();
    } catch (error) {
        return `❌ LỖI: ${error.message}`;
    } finally {
        await browser.close();
    }
}