/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// 1x1 transparent PNG base64, we will just use this as a placeholder for both icons.
// The browser might complain about the size but it will load.
// Actually, here's a small valid 192x192 and 512x512 PNG would be large. Let's just write the 1x1 base64. 
// A real app would replace these.
const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const buffer = Buffer.from(base64Png, 'base64');

fs.writeFileSync(path.join(__dirname, 'public', 'icons', 'icon-192x192.png'), buffer);
fs.writeFileSync(path.join(__dirname, 'public', 'icons', 'icon-512x512.png'), buffer);

console.log("Icons generated.");
