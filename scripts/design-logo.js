
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { execSync } from 'child_process';

const root = process.cwd();
const resourcesDir = path.join(root, 'resources');
const publicDir = path.join(root, 'public');
const iconSetDir = path.join(root, 'resources', 'icon.iconset');

// Ensure directories exist
if (!fs.existsSync(resourcesDir)) fs.mkdirSync(resourcesDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// SVG Content
const svgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
    </linearGradient>
    <filter id="dropShadow" height="130%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="15"/>
      <feOffset dx="0" dy="10" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge> 
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/> 
      </feMerge>
    </filter>
  </defs>

  <!-- macOS Squircle Background -->
  <rect x="52" y="52" width="920" height="920" rx="200" ry="200" fill="url(#grad)" filter="url(#dropShadow)" />

  <!-- Icon Content: Stylized 'Note' with 'Insight' Spark -->
  <g transform="translate(512, 512)" fill="#ffffff">
    <!-- Document Shape -->
    <path d="M-180 -280 H100 L240 -140 V280 C240 313.137 213.137 340 180 340 H-180 C-213.137 340 -240 313.137 -240 280 V-220 C-240 -253.137 -213.137 -280 -180 -280 Z" opacity="0.9" />
    
    <!-- Folded Corner -->
    <path d="M100 -280 V-160 C100 -148.954 108.954 -140 120 -140 H240 L100 -280 Z" fill="#333" opacity="0.4" />
    
    <!-- Spark / Insight Symbol (cutting out from the note) -->
    <path d="M-80 -80 L60 -80 L-20 20 L40 20 L-60 160 L-30 60 L-100 60 Z" fill="#1a1a1a" />
    
    <!-- Decorative Lines -->
    <rect x="-140" y="-180" width="160" height="20" rx="10" fill="#1a1a1a" opacity="0.8" />
    <rect x="-140" y="220" width="280" height="20" rx="10" fill="#1a1a1a" opacity="0.8" />
  </g>
</svg>
`;

async function generate() {
  console.log('Generating new logo...');
  const svgBuffer = Buffer.from(svgContent);

  // 1. Generate Master PNGs (1024x1024)
  const masterPngPath = path.join(resourcesDir, 'icon.png');
  const publicPngPath = path.join(publicDir, 'icon.png');
  
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(masterPngPath);
    
  // Copy to public/icon.png (resize to 512 for web usage usually, but 1024 is fine)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(publicPngPath);
    
  console.log('Master icons generated.');

  // 2. Generate variants for .ico and .icns
  // We can reuse the existing script for .ico, but let's just do it all here to be safe and handle .iconset for .icns
  
  // Clean/Create iconset dir
  if (fs.existsSync(iconSetDir)) {
    fs.rmSync(iconSetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(iconSetDir);

  const icnsSizes = [
    { size: 16, name: 'icon_16x16.png' },
    { size: 32, name: 'icon_16x16@2x.png' },
    { size: 32, name: 'icon_32x32.png' },
    { size: 64, name: 'icon_32x32@2x.png' },
    { size: 128, name: 'icon_128x128.png' },
    { size: 256, name: 'icon_128x128@2x.png' },
    { size: 256, name: 'icon_256x256.png' },
    { size: 512, name: 'icon_256x256@2x.png' },
    { size: 512, name: 'icon_512x512.png' },
    { size: 1024, name: 'icon_512x512@2x.png' }
  ];

  for (const { size, name } of icnsSizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconSetDir, name));
  }
  console.log('Iconset files generated.');

  // 3. Generate .icns using iconutil (macOS only)
  try {
    const icnsPath = path.join(resourcesDir, 'icon.icns');
    execSync(`iconutil -c icns -o "${icnsPath}" "${iconSetDir}"`);
    console.log(`Generated: ${icnsPath}`);
  } catch (e) {
    console.error('Failed to generate .icns (requires macOS iconutil):', e.message);
  }

  // 4. Clean up iconset
  fs.rmSync(iconSetDir, { recursive: true, force: true });

  // 5. Run existing script to generate .ico and standard variants
  try {
    console.log('Running gen-icon.js for .ico...');
    execSync('node scripts/gen-icon.js', { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to run gen-icon.js:', e.message);
  }

  console.log('Done! Logo updated.');
}

generate().catch(console.error);
