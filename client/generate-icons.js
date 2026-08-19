import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputLogo = path.join(__dirname, 'Logo.png');
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function generateAssets() {
  console.log('🔄 Generating Favicon and Icon Assets from Logo.png...');

  // 1. Standard PNG Favicons
  await sharp(inputLogo).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));
  console.log('✅ favicon-16x16.png created');

  await sharp(inputLogo).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('✅ favicon-32x32.png created');

  await sharp(inputLogo).resize(48, 48).png().toFile(path.join(publicDir, 'favicon-48x48.png'));
  console.log('✅ favicon-48x48.png created');

  // 2. Apple Touch Icon (180x180)
  await sharp(inputLogo).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✅ apple-touch-icon.png created (180x180)');

  // 3. Android Chrome Manifest Icons
  await sharp(inputLogo).resize(192, 192).png().toFile(path.join(publicDir, 'android-chrome-192x192.png'));
  console.log('✅ android-chrome-192x192.png created (192x192)');

  await sharp(inputLogo).resize(512, 512).png().toFile(path.join(publicDir, 'android-chrome-512x512.png'));
  console.log('✅ android-chrome-512x512.png created (512x512)');

  // 4. Multi-size Favicon.ico
  // Writing a 32x32 and 48x48 ICO
  const ico32Buffer = await sharp(inputLogo).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico32Buffer);
  console.log('✅ favicon.ico created');

  // 5. Open Graph / Twitter Card Image (1200x630)
  // Create luxurious dark canvas with glowing backdrop and centered logo
  const logoResized = await sharp(inputLogo)
    .resize(360, 360, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const svgBanner = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.32" />
          <stop offset="45%" stop-color="#c44ff0" stop-opacity="0.16" />
          <stop offset="100%" stop-color="#09090f" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fdf4ff" />
          <stop offset="50%" stop-color="#e9a8fd" />
          <stop offset="100%" stop-color="#fcd34d" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="#09090f" />
      <rect width="1200" height="630" fill="url(#bgGlow)" />
      
      <!-- Top Badges / Tagline -->
      <text x="600" y="470" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" fill="url(#textGrad)" letter-spacing="2">
        7 WHEEL CENTRAL HUB
      </text>
      <text x="600" y="520" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600" fill="#94a3b8" letter-spacing="1.5">
        MULTIPLAYER SOCIAL GAMING · PROVABLY FAIR · 7 CASINO MINI-GAMES
      </text>
    </svg>
  `);

  await sharp(svgBanner)
    .composite([
      {
        input: logoResized,
        top: 75,
        left: Math.round((1200 - 360) / 2),
      },
    ])
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));

  console.log('✅ og-image.png created (1200x630)');
  console.log('🎉 All assets successfully generated in client/public/');
}

generateAssets().catch((err) => {
  console.error('❌ Error generating assets:', err);
  process.exit(1);
});
