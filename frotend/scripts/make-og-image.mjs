// Generates `public/og-default.png` — the 1200×630 social sharing card.
//
// Kept dependency-free (a hand-rolled PNG encoder) so the file can be
// regenerated anywhere with `node scripts/make-og-image.mjs` without pulling in
// a native image toolchain.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const WIDTH = 1200
const HEIGHT = 630

const NAVY_TOP = [18, 32, 50]
const NAVY_BOTTOM = [9, 15, 24]
const GOLD = [212, 175, 55]
const IVORY = [232, 224, 208]

// A tiny 5×7 bitmap font — only the glyphs the wordmark needs.
const GLYPHS = {
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
}

const pixels = new Uint8Array(WIDTH * HEIGHT * 4)

function setPixel(x, y, [r, g, b], alpha = 255) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return
  const offset = (y * WIDTH + x) * 4
  pixels[offset] = r
  pixels[offset + 1] = g
  pixels[offset + 2] = b
  pixels[offset + 3] = alpha
}

function fillRect(x, y, w, h, color, alpha = 255) {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) setPixel(col, row, color, alpha)
  }
}

function drawWord(text, scale) {
  const glyphWidth = 5 * scale
  const glyphGap = scale
  const totalWidth =
    text.length * glyphWidth + (text.length - 1) * glyphGap
  const totalHeight = 7 * scale
  let originX = Math.round((WIDTH - totalWidth) / 2)
  const originY = Math.round((HEIGHT - totalHeight) / 2) - 20

  for (const character of text) {
    const glyph = GLYPHS[character]
    if (!glyph) {
      originX += glyphWidth + glyphGap
      continue
    }
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] === '1') {
          fillRect(
            originX + col * scale,
            originY + row * scale,
            scale,
            scale,
            GOLD,
          )
        }
      }
    }
    originX += glyphWidth + glyphGap
  }
}

// Vertical background gradient.
for (let y = 0; y < HEIGHT; y += 1) {
  const t = y / (HEIGHT - 1)
  const color = NAVY_TOP.map((channel, index) =>
    Math.round(channel + (NAVY_BOTTOM[index] - channel) * t),
  )
  fillRect(0, y, WIDTH, 1, color)
}

drawWord('LUCINE', 18)

// Two thin rules framing the wordmark.
const ruleWidth = 420
const ruleX = Math.round((WIDTH - ruleWidth) / 2)
fillRect(ruleX, 190, ruleWidth, 2, GOLD)
fillRect(ruleX, HEIGHT - 192, ruleWidth, 2, IVORY)

// Fine gold border inset.
const inset = 28
fillRect(inset, inset, WIDTH - inset * 2, 1, GOLD)
fillRect(inset, HEIGHT - inset - 1, WIDTH - inset * 2, 1, GOLD)
fillRect(inset, inset, 1, HEIGHT - inset * 2, GOLD)
fillRect(WIDTH - inset - 1, inset, 1, HEIGHT - inset * 2, GOLD)

// --- Minimal PNG encoder -----------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBuffer = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([length, typeBuffer, data, crc])
}

function encodePng() {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(WIDTH, 0)
  ihdr.writeUInt32BE(HEIGHT, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const rowLength = WIDTH * 4
  const raw = Buffer.alloc((rowLength + 1) * HEIGHT)
  for (let y = 0; y < HEIGHT; y += 1) {
    raw[y * (rowLength + 1)] = 0 // filter: none
    Buffer.from(pixels.buffer, y * rowLength, rowLength).copy(
      raw,
      y * (rowLength + 1) + 1,
    )
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const here = dirname(fileURLToPath(import.meta.url))
const output = join(here, '..', 'public', 'og-default.png')
writeFileSync(output, encodePng())
console.log(`Wrote ${output} (${WIDTH}×${HEIGHT})`)
