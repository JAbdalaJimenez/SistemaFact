const sharp = require('sharp');
const path = require('path');

async function process() {
  const inputPath = path.join(__dirname, '../public/logo-source.jpg');
  const publicDir = path.join(__dirname, '../public');

  const hCrop = {
    left: 144,
    top: 265,
    width: 672,
    height: 138,
  };

  const iconCrop = {
    left: 144,
    top: 265,
    width: 117,
    height: 138,
  };

  async function generateFull(isLight = false) {
    const cropped = await sharp(inputPath).extract(hCrop).raw().toBuffer({ resolveWithObject: true });
    const cw = cropped.info.width;
    const ch = cropped.info.height;
    const cdata = cropped.data;
    const rgba = Buffer.alloc(cw * ch * 4);

    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const i = y * cw + x;
        let r = cdata[i * 3];
        let g = cdata[i * 3 + 1];
        let b = cdata[i * 3 + 2];

        // Wipe ONLY the small stray tip from the upper logo centered bolt tip:
        // x between 340 and 400, y < 25 (letters start well below y=35)
        if (x >= 340 && x <= 400 && y < 25) {
          rgba[i * 4 + 3] = 0;
          continue;
        }

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);

        if (lum > 225 && sat < 15) {
          rgba[i * 4 + 3] = 0;
        } else if (lum > 205 && sat < 20) {
          const alpha = Math.round(255 * (1 - (lum - 205) / 20));
          rgba[i * 4 + 3] = Math.max(0, Math.min(255, alpha));
        } else {
          rgba[i * 4 + 3] = 255;
        }

        if (isLight) {
          if (lum < 100 && sat < 35) {
            r = 255;
            g = 255;
            b = 255;
          }
        }

        rgba[i * 4] = r;
        rgba[i * 4 + 1] = g;
        rgba[i * 4 + 2] = b;
      }
    }

    const filename = isLight ? 'logo-full-light.png' : 'logo-full.png';
    await sharp(rgba, { raw: { width: cw, height: ch, channels: 4 } })
      .png()
      .toFile(path.join(publicDir, filename));
    console.log('Saved:', filename);
  }

  async function generateIcon(isLight = false) {
    const cropped = await sharp(inputPath).extract(iconCrop).raw().toBuffer({ resolveWithObject: true });
    const cw = cropped.info.width;
    const ch = cropped.info.height;
    const cdata = cropped.data;
    const rgba = Buffer.alloc(cw * ch * 4);

    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const i = y * cw + x;
        let r = cdata[i * 3];
        let g = cdata[i * 3 + 1];
        let b = cdata[i * 3 + 2];

        // Clean any stray edge near right edge where letter 'E' starts
        if (x > 111 && y > 50 && y < 115) {
          rgba[i * 4 + 3] = 0;
          continue;
        }

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);

        if (lum > 225 && sat < 15) {
          rgba[i * 4 + 3] = 0;
        } else if (lum > 205 && sat < 20) {
          const alpha = Math.round(255 * (1 - (lum - 205) / 20));
          rgba[i * 4 + 3] = Math.max(0, Math.min(255, alpha));
        } else {
          rgba[i * 4 + 3] = 255;
        }

        if (isLight) {
          if (lum < 100 && sat < 35) {
            r = 255;
            g = 255;
            b = 255;
          }
        }

        rgba[i * 4] = r;
        rgba[i * 4 + 1] = g;
        rgba[i * 4 + 2] = b;
      }
    }

    const filename = isLight ? 'logo-icon-light.png' : 'logo-icon.png';
    await sharp(rgba, { raw: { width: cw, height: ch, channels: 4 } })
      .png()
      .toFile(path.join(publicDir, filename));
    console.log('Saved:', filename);
  }

  await generateFull(false);
  await generateFull(true);
  await generateIcon(false);
  await generateIcon(true);
}

process().catch(console.error);
