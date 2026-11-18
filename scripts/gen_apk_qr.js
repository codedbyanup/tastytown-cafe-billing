const fs = require('fs');
const { toQR } = require('toqr', { paths: ['./node_modules/expo/node_modules/@expo/cli'] });
const url = 'https://expo.dev/artifacts/eas/RBIafyMuCzE62msfN_rczk1A2GjuwBSlnw13Nwe0FUE.apk';
const buf = toQR(url);
const extent = Math.sqrt(buf.byteLength);
const border = 4;
const size = extent + border * 2;
const scale = 8;

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size * scale} ${size * scale}" width="320" height="320">
  <rect width="100%" height="100%" fill="#ffffff"/>
`;

for (let r = 0; r < extent; r++) {
  for (let c = 0; c < extent; c++) {
    if (buf[r * extent + c]) {
      svg += `  <rect x="${(c + border) * scale}" y="${(r + border) * scale}" width="${scale}" height="${scale}" fill="#000000"/>\n`;
    }
  }
}
svg += `</svg>`;

fs.writeFileSync('apk_qrcode.svg', svg);
fs.writeFileSync('C:/Users/dilip/.gemini/antigravity/brain/d9d645a3-a5f3-4f5a-a139-c93e18f7cae7/apk_qrcode.svg', svg);
console.log('Successfully generated apk_qrcode.svg');
