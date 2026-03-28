/**
 * Icon-Generator fuer RSI VR Tool
 * Erstellt icon-192.png und icon-512.png in public/icons/
 * Keine externen Abhaengigkeiten – nur Node.js built-ins
 */

import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// CRC32-Tabelle fuer PNG-Chunks
const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[i] = c
}

function crc32(buf) {
  let crc = -1
  for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function u32(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n, 0)
  return b
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const crcInput = Buffer.concat([t, data])
  return Buffer.concat([u32(data.length), t, data, u32(crc32(crcInput))])
}

// Zeichnet ein Pixel – gibt [r, g, b] zurueck
function pixel(x, y, size) {
  const cx = size / 2
  const cy = size / 2
  const s = size

  // Hintergrund: KZH Blau #003C71
  let r = 0, g = 60, b = 113

  // Weisser Kreis-Rahmen (Icon-Form)
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
  const outerR = s * 0.45
  const innerR = s * 0.40

  if (dist <= outerR && dist >= innerR) {
    return [255, 255, 255]
  }

  if (dist > outerR) {
    return [r, g, b]
  }

  // Strasse (weisses Rechteck, horizontal)
  const rLeft  = cx - s * 0.32
  const rRight = cx + s * 0.32
  const rTop   = cy - s * 0.11
  const rBot   = cy + s * 0.11

  if (x >= rLeft && x <= rRight && y >= rTop && y <= rBot) {
    // Mittelstreifen gestrichelt
    const dashLen   = s * 0.09
    const dashPhase = (x - rLeft) % (dashLen * 2)
    const centerY   = cy
    if (Math.abs(y - centerY) <= s * 0.02 && dashPhase < dashLen) {
      return [r, g, b] // KZH Blau als Strich
    }
    return [255, 255, 255]
  }

  // Vertikale Striche oben/unten (Pfeile / Orientierung)
  const pillarW = s * 0.05
  const pillarH = s * 0.14
  if (
    Math.abs(x - cx) <= pillarW &&
    (y < rTop - s * 0.02) &&
    y >= rTop - s * 0.02 - pillarH &&
    y >= cy - outerR + s * 0.06
  ) {
    return [255, 255, 255]
  }

  return [r, g, b]
}

function createPNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.concat([
    u32(size), u32(size),
    Buffer.from([8, 2, 0, 0, 0]) // 8-bit RGB
  ])

  const raw = []
  for (let y = 0; y < size; y++) {
    raw.push(0) // Kein Filter
    for (let x = 0; x < size; x++) {
      raw.push(...pixel(x, y, size))
    }
  }

  const compressed = deflateSync(Buffer.from(raw))

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(join(__dirname, 'public', 'icons'), { recursive: true })
writeFileSync(join(__dirname, 'public', 'icons', 'icon-192.png'), createPNG(192))
writeFileSync(join(__dirname, 'public', 'icons', 'icon-512.png'), createPNG(512))

console.log('Icons erstellt:')
console.log('  public/icons/icon-192.png')
console.log('  public/icons/icon-512.png')
