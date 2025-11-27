import fs from 'fs';
import path from 'path';
import pngToIco from 'png-to-ico';

const src = path.join(process.cwd(), 'resources', 'icon.png');
const dest = path.join(process.cwd(), 'resources', 'icon.ico');

async function run() {
  if (!fs.existsSync(src)) {
    console.error(`源图标不存在: ${src}`);
    process.exit(1);
  }
  const buf = fs.readFileSync(src);
  const ico = await pngToIco(buf);
  fs.writeFileSync(dest, ico);
  console.log(`生成 ICO: ${dest}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
