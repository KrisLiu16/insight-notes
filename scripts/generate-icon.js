import fs from 'fs';
import path from 'path';
import pngToIco from 'png-to-ico';

const root = process.cwd();
const variantsDir = path.join(root, 'resources', 'icon-variants');
const outputIco = path.join(root, 'resources', 'icon.ico');
const expectedSizes = ['16', '24', '32', '48', '64', '128', '256', '512'];

const missing = expectedSizes.filter(size => !fs.existsSync(path.join(variantsDir, `icon-${size}.png`)));
if (missing.length) {
  console.warn('[icon] Missing sizes:', missing.join(', '));
}

const files = expectedSizes
  .map(size => path.join(variantsDir, `icon-${size}.png`))
  .filter(p => fs.existsSync(p));

if (!files.length) {
  console.error('[icon] No icon variants found under resources/icon-variants');
  process.exit(1);
}

pngToIco(files)
  .then(buf => {
    fs.writeFileSync(outputIco, buf);
    console.log(`[icon] Generated icon.ico with ${files.length} variants -> ${outputIco}`);
  })
  .catch(err => {
    console.error('[icon] Failed to generate icon.ico', err);
    process.exit(1);
  });
