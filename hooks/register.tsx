import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'

const LAP_SECONDS = 2.4

// Whether the main loop is working on a turn right now, and whether the
// person has the patrol switched on (/mallcop toggles it).
const isBusy = atom({ plugin: 'mallcop-segway', key: 'isBusy' } as const, false)
const isEnabled = atom({ plugin: 'mallcop-segway', key: 'isEnabled' } as const, true)

// ---------------------------------------------------------------------------
// Desktop / VS Code / mobile: one self-animating SVG (SMIL), no timers needed.
// ---------------------------------------------------------------------------

const LAP = `${LAP_SECONDS}s`

const RIDER = `
  <ellipse cx="0" cy="1" rx="19" ry="4" fill="#000" opacity=".18"/>
  <g>
    <animateTransform attributeName="transform" type="translate" values="0 0;0 -1.5;0 0" dur="0.3s" repeatCount="indefinite"/>
    <g transform="rotate(6)">
      <g transform="translate(-2,-10)">
        <circle r="10" fill="#2b2b2b"/>
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.4s" repeatCount="indefinite"/>
          <line x1="-7" y1="0" x2="7" y2="0" stroke="#666" stroke-width="2"/>
          <line x1="0" y1="-7" x2="0" y2="7" stroke="#666" stroke-width="2"/>
        </g>
        <circle r="3" fill="#9aa3ad"/>
      </g>
      <rect x="-17" y="-23" width="31" height="5" rx="2" fill="#3d4650"/>
      <path d="M8,-21 L16,-66" stroke="#7d8790" stroke-width="4" stroke-linecap="round"/>
      <path d="M11,-67 L23,-65" stroke="#3d4650" stroke-width="5" stroke-linecap="round"/>
      <path d="M-10,-23 L-9,-50 L6,-50 L5,-23 Z" fill="#1f2a44"/>
      <path d="M-2,-46 L-2,-24" stroke="#141c30" stroke-width="1"/>
      <rect x="-13" y="-27" width="20" height="5" rx="2" fill="#111"/>
      <path d="M-15,-47 C-22,-62 -13,-81 0,-81 C13,-81 19,-62 13,-47 Z" fill="#a9c7e8"/>
      <rect x="-15" y="-51" width="28" height="4" fill="#222"/>
      <rect x="3" y="-51" width="4" height="4" fill="#d4a72c"/>
      <rect x="-19" y="-58" width="5" height="10" rx="1" fill="#222"/>
      <path d="M-17,-58 L-17,-65" stroke="#222" stroke-width="1.5"/>
      <path d="M6,-72 l1.5,3 3.2,.4 -2.4,2.2 .7,3.2 -3,-1.6 -3,1.6 .7,-3.2 -2.4,-2.2 3.2,-.4 Z" fill="#d4a72c"/>
      <circle cx="-7" cy="-72" r="3" fill="#2c4a7a"/>
      <path d="M-3,-73 Q6,-60 19,-66" stroke="#a9c7e8" stroke-width="7" fill="none" stroke-linecap="round"/>
      <circle cx="20" cy="-66" r="3.5" fill="#f2c79b"/>
      <circle cx="1" cy="-90" r="11" fill="#f2c79b"/>
      <path d="M-9,-82 Q1,-75 10,-81" stroke="#e1b083" stroke-width="1.5" fill="none"/>
      <path d="M-10,-92 C-10,-104 10,-105 12,-95 C6,-98 -2,-97 -4,-92 Z" fill="#3b2a1f"/>
      <circle cx="-3" cy="-90" r="2.5" fill="#e1b083"/>
      <circle cx="6" cy="-92" r="1.3" fill="#222"/>
      <ellipse cx="12" cy="-89" rx="2.6" ry="2" fill="#e8b585"/>
      <path d="M4,-85 Q9,-88 15,-85 Q9,-82 4,-85 Z" fill="#3b2a1f"/>
    </g>
  </g>`

const STORES = [
  { x: 12, name: 'PRETZELS', color: '#c0392b' },
  { x: 96, name: 'TOYS', color: '#2e8b57' },
  { x: 180, name: 'SHOES', color: '#2c5aa0' },
]

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 220" width="260" height="220">
  <rect width="260" height="220" rx="10" fill="#e3dccd"/>
  <rect width="260" height="100" fill="#efe7d8"/>
  ${STORES.map(
    s => `<rect x="${s.x}" y="16" width="68" height="14" rx="2" fill="${s.color}"/>
  <text x="${s.x + 34}" y="26.5" font-family="Arial,Helvetica,sans-serif" font-size="9" font-weight="700" fill="#fff" text-anchor="middle">${s.name}</text>
  <rect x="${s.x}" y="32" width="68" height="64" fill="#cfe3ee" stroke="#8a7f6a" stroke-width="2"/>
  <path d="M${s.x + 34},32 L${s.x + 34},96" stroke="#8a7f6a" stroke-width="1.5"/>`,
  ).join('\n  ')}
  <rect y="96" width="260" height="4" fill="#b9ae98"/>
  <path d="M0,120 H260 M0,145 H260 M0,178 H260 M60,100 L20,220 M130,100 V220 M200,100 L240,220" stroke="#d2c9b6" stroke-width="1"/>
  <ellipse cx="130" cy="165" rx="78" ry="26" fill="none" stroke="#b5ab97" stroke-width="2" stroke-dasharray="5 6"/>
  <g>
    <animateMotion dur="${LAP}" repeatCount="indefinite" path="M52,165 A78,26 0 0 0 208,165 A78,26 0 0 0 52,165"/>
    <g>
      <animateTransform attributeName="transform" type="scale" values="0.85;1;0.85;0.7;0.85" keyTimes="0;0.25;0.5;0.75;1" dur="${LAP}" repeatCount="indefinite"/>
      <g>
        <animateTransform attributeName="transform" type="scale" values="1 1;-1 1" keyTimes="0;0.5" calcMode="discrete" dur="${LAP}" repeatCount="indefinite"/>
        ${RIDER}
      </g>
    </g>
  </g>
</svg>`

// ---------------------------------------------------------------------------
// Terminal: a half-block pixel-art Raster, repainted with $.ui.blit.
// ---------------------------------------------------------------------------

const COLS = 40
const ROWS = 12 // two pixels per cell (▀ upper half block)
const PX_H = ROWS * 2
const FRAMES = 24
const DEFAULT = 0x01000000

const PALETTE: Record<string, number> = {
  H: 0x3b2a1f, // hair
  S: 0xf2c79b, // skin
  E: 0x222222, // eye
  M: 0x3b2a1f, // mustache
  B: 0xa9c7e8, // shirt
  G: 0xd4a72c, // badge
  K: 0x222222, // belt
  N: 0x1f2a44, // pants
  D: 0x111111, // shoes
  T: 0x7d8790, // segway steel
  W: 0x2b2b2b, // wheel
  w: 0x9aa3ad, // hub
  o: 0x1a1a1a, // shadow
}

// Facing right; 12 wide, 20 tall.
const SPRITE = [
  '...HHHH.....',
  '..HHHHHH....',
  '..HSSSSSS...',
  '..HSSSESS...',
  '..SSSSSSSS..',
  '...SSMMMM...',
  '....SSSS....',
  '..BBBBBB.TTT',
  '.BBBBGBBBSS.',
  '.BBBBBBB.T..',
  '.BBBBBBB.T..',
  '.KKKGKKK.T..',
  '..NNNNN..T..',
  '..NNNNN..T..',
  '..NN.NN.T...',
  '..NN.NN.T...',
  '.DDD.DDDT...',
  '.TTTTTTTTT..',
  '..WWWwWWW...',
  '...WWWWW....',
]
const SPRITE_W = SPRITE[0].length
const SPRITE_H = SPRITE.length

const FLOOR = 0xd9d3c7
const TRACK = 0xb5ab97
const CX = 20
const CY = 21
const RX = 13
const RY = 2

function framePixels(index: number): Uint32Array {
  const px = new Uint32Array(COLS * PX_H).fill(DEFAULT)
  const set = (x: number, y: number, c: number) => {
    if (x >= 0 && x < COLS && y >= 0 && y < PX_H) px[y * COLS + x] = c
  }

  // Floor and the dashed track ring.
  for (let y = 0; y < PX_H; y++) {
    for (let x = 0; x < COLS; x++) {
      const d = ((x - CX) / (RX + 5)) ** 2 + ((y - CY) / (RY + 3)) ** 2
      if (d <= 1) set(x, y, FLOOR)
    }
  }
  for (let t = 0; t < 64; t += 2) {
    const a = (t / 64) * Math.PI * 2
    set(Math.round(CX + RX * Math.cos(a)), Math.round(CY + RY * Math.sin(a)), TRACK)
  }

  // Rider position on the ellipse; front (bottom) moves left, back moves right.
  const a = (index / FRAMES) * Math.PI * 2
  const fx = Math.round(CX + RX * Math.cos(a))
  const fy = Math.round(CY + RY * Math.sin(a))
  const facingRight = Math.sin(a) < 0
  const bob = index % 2

  for (let dx = -3; dx <= 3; dx++) set(fx + dx, fy + 1, PALETTE.o)

  const left = fx - Math.floor(SPRITE_W / 2)
  const top = fy - SPRITE_H + 1 - bob
  for (let sy = 0; sy < SPRITE_H; sy++) {
    for (let sx = 0; sx < SPRITE_W; sx++) {
      const ch = SPRITE[sy][facingRight ? sx : SPRITE_W - 1 - sx]
      if (ch === '.') continue
      // Spin the hub so the wheel looks like it is rolling.
      const color = ch === 'w' && index % 2 ? PALETTE.W : PALETTE[ch]
      // Keep the wheel rows anchored to the floor while the body bobs.
      set(left + sx, top + sy + (sy >= SPRITE_H - 3 ? bob : 0), color)
    }
  }
  return px
}

function frameCells(index: number): string {
  const px = framePixels(index)
  const words = new Uint32Array(COLS * ROWS * 3)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const top = px[r * 2 * COLS + c]
      const bottom = px[(r * 2 + 1) * COLS + c]
      const i = (r * COLS + c) * 3
      if (top === DEFAULT && bottom === DEFAULT) {
        words[i] = 0x20
        words[i + 1] = DEFAULT
        words[i + 2] = DEFAULT
      } else {
        words[i] = 0x2580 // ▀
        words[i + 1] = top
        words[i + 2] = bottom
      }
    }
  }
  return new Uint8Array(words.buffer).toBase64()
}

const FRAME_CELLS = Array.from({ length: FRAMES }, (_, i) => frameCells(i))

// ---------------------------------------------------------------------------

export const register: Register = on => {
  let frame = 0
  let ticker: Timer | undefined
  let bandId: string | undefined // the band's requestId, for terminal blits

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'mallcop',
      description: 'Toggle the mall cop who patrols above the prompt while Claude is thinking',
    })
    // A reload mid-turn must not leave him stuck on screen.
    await update($, isBusy, () => false)
    return next(e)
  })

  on('command.run', { command: 'mallcop' }, async $ => {
    const now = !(await read($, isEnabled))
    await update($, isEnabled, () => now)
    return { text: now ? 'Mall Patrol is on duty while Claude thinks.' : 'Mall Patrol is off duty.' }
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e) // main loop only
    await update($, isBusy, () => true)
    ticker?.cancel()
    // Only the terminal draws a Raster; the SVG animates itself elsewhere.
    ticker = $.clock.every(Math.round((LAP_SECONDS * 1000) / FRAMES), () => {
      frame = (frame + 1) % FRAMES
      if (bandId === undefined) return
      void $.ui
        .blit({ requestId: bandId, key: 'patrol', columns: COLS, rows: ROWS, cells: FRAME_CELLS[frame] })
        .catch(() => {})
    })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    ticker?.cancel()
    ticker = undefined
    bandId = undefined
    await update($, isBusy, () => false)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const show = (await read($, isBusy)) && (await read($, isEnabled)) && !e.props.hasSurvey
    if (!show) return next(e)

    if (e.surface === 'terminal') {
      bandId = e.requestId
      const { Box, Raster } = $.ui.resolve(e)
      return (
        <Box>
          <Raster key="patrol" columns={COLS} rows={ROWS} cells={FRAME_CELLS[frame]} />
        </Box>
      )
    }
    const { Box, Svg } = $.ui.resolve(e)
    return (
      <Box>
        <Svg
          source={SVG}
          isInteractive
          height={130}
          alt="A mustachioed mall cop riding a segway in a tight circle while Claude thinks"
        />
      </Box>
    )
  })
}
