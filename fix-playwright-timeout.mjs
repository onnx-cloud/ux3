import fs from 'fs';
let content = fs.readFileSync('playwright.config.ts', 'utf8');

// Change port to 1337 to avoid potential 5173 issues, although 5173 seems fine now
// More importantly, add a longer timeout and ensure it uses 127.0.0.1 if needed
content = content.replace("baseURL: 'http://localhost:5173'", "baseURL: 'http://127.0.0.1:5173'");
content = content.replace("url: 'http://localhost:5173'", "url: 'http://127.0.0.1:5173'");

// Increase timeout for webServer
if (!content.includes('timeout: 120000')) {
  content = content.replace("reuseExistingServer: !process.env.CI,", "reuseExistingServer: !process.env.CI,\n    timeout: 120000,");
}

fs.writeFileSync('playwright.config.ts', content);
