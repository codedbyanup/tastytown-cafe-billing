const fs = require('fs');
const { toQR } = require('toqr', { paths: ['./node_modules/expo/node_modules/@expo/cli'] });
const url = 'exp://10.231.244.167:8081';
const buf = toQR(url);
const extent = Math.sqrt(buf.byteLength);
const border = 4;
const size = extent + border * 2;
const scale = 12;

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size * scale} ${size * scale}" width="330" height="330">
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

fs.writeFileSync('qrcode.svg', svg);
console.log('Successfully generated qrcode.svg for', url);
