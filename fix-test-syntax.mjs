import fs from 'fs';
let content = fs.readFileSync('src/__tests__/e2e/config-driven.spec.ts', 'utf8');

// Fix escaped backticks from previous cat command
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

// Also update the port in the test to 5173 if it's currently 1337
content = content.replace("localhost:1337", "127.0.0.1:5173");
content = content.replace("http://localhost:5173", "http://127.0.0.1:5173");

fs.writeFileSync('src/__tests__/e2e/config-driven.spec.ts', content);
