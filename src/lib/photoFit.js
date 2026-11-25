/* Where the car is in a photo. Photos come from everywhere: cut-outs with a wide
   empty margin, cars shot on white, ordinary pictures. Knowing where the car is
   lets every card show it at the same size, standing on the same line. */

const READ_AT = 96                 // the photo is read at this width: enough, and instant
const known = new Map()            // src → fit

export const knownFit = (src) => known.get(src) ?? null

// The agency's storage lets a canvas read its photos, if they are asked for that
// way. Files of the site need nothing; other sites don't allow it.
const STORAGE = import.meta.env.VITE_SUPABASE_URL
export const needsCors = (src) => Boolean(STORAGE && src?.startsWith(STORAGE))

const PLAIN = { kind: 'plain' }    // unknown: shown whole
const SCENE = { kind: 'scene' }    // a picture with its own background: fills the frame

function read(img) {
  const w = READ_AT
  const h = Math.round((w * img.naturalHeight) / img.naturalWidth)
  if (!h) return PLAIN

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  let px
  try {
    ctx.drawImage(img, 0, 0, w, h)
    px = ctx.getImageData(0, 0, w, h).data
  } catch {
    return PLAIN                   // another site's photo
  }

  const corners = [0, w - 1, (h - 1) * w, h * w - 1].map(i => px.subarray(i * 4, i * 4 + 4))
  const cut = corners.filter(c => c[3] < 20).length >= 3
  const white = !cut && corners.every(c => Math.min(c[0], c[1], c[2]) > 236)
  if (!cut && !white) return SCENE

  let [l, t, r, b] = [w, h, -1, -1]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const drawn = cut ? px[i + 3] > 48 : Math.min(px[i], px[i + 1], px[i + 2]) < 228
      if (!drawn) continue
      if (x < l) l = x
      if (x > r) r = x
      if (y < t) t = y
      if (y > b) b = y
    }
  }
  if (r < 0) return PLAIN

  /* Cropped by the edge of its own photo (a trimmed car only touches it): the photo's
     edge must then be the frame's. Told from how much of that side is car. */
  const filled = (n, isCar) => Array.from({ length: n }, (_, k) => isCar(k)).filter(Boolean).length / n
  const car = (x, y) => cut && px[(y * w + x) * 4 + 3] > 48
  const tall = b + 1 - t
  const atLeft = l === 0 && filled(tall, k => car(0, t + k)) > 0.35
  const atRight = r === w - 1 && filled(tall, k => car(w - 1, t + k)) > 0.35
  const atBottom = b === h - 1 && filled(r + 1 - l, k => car(l + k, h - 1)) > (atLeft || atRight ? 0.25 : 0.6)

  const width = (r + 1 - l) / w
  const height = (b + 1 - t) / h
  return {
    kind: cut ? 'cut' : 'white',
    edges: [atLeft !== atRight && (atLeft ? 'left' : 'right'), atBottom && 'bottom'].filter(Boolean),
    // Shape of the car alone, then where the whole photo goes so that the car
    // fills a box of that shape: in % of that box.
    ratio: (width * img.naturalWidth) / (height * img.naturalHeight),
    zoom: 100 / width,
    left: (-100 * l) / w / width,
    top: (-100 * t) / h / height,
  }
}

export function measureFit(img, src) {
  if (!known.has(src)) known.set(src, read(img))
  return known.get(src)
}
