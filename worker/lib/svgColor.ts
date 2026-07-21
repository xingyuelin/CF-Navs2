export function extractSvgText(bytes: Uint8Array, contentType: string): string {
  if (!contentType.includes('svg')) return ''

  try {
    return new TextDecoder().decode(bytes)
  } catch {
    return ''
  }
}

function parseHexColor(value: string): [number, number, number] | null {
  const hex = value.replace(/^#/, '').trim()
  if (/^[0-9a-f]{3}$/i.test(hex) || /^[0-9a-f]{4}$/i.test(hex)) {
    return [
      Number.parseInt(hex[0] + hex[0], 16),
      Number.parseInt(hex[1] + hex[1], 16),
      Number.parseInt(hex[2] + hex[2], 16),
    ]
  }

  if (/^[0-9a-f]{6}$/i.test(hex) || /^[0-9a-f]{8}$/i.test(hex)) {
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ]
  }

  return null
}

function parseRgbColor(value: string): [number, number, number] | null {
  const match = value.match(/^rgba?\(([^)]+)\)$/i)
  if (!match) return null

  const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()))
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null

  return [
    Math.max(0, Math.min(255, parts[0])),
    Math.max(0, Math.min(255, parts[1])),
    Math.max(0, Math.min(255, parts[2])),
  ]
}

function parseNamedColor(value: string): [number, number, number] | null {
  const colors: Record<string, [number, number, number]> = {
    black: [0, 0, 0],
    white: [255, 255, 255],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    red: [255, 0, 0],
    orange: [255, 165, 0],
    yellow: [255, 255, 0],
    green: [0, 128, 0],
    blue: [0, 0, 255],
    purple: [128, 0, 128],
    pink: [255, 192, 203],
    cyan: [0, 255, 255],
    magenta: [255, 0, 255],
  }

  return colors[value.toLowerCase()] ?? null
}

function parseCssColor(value: string): [number, number, number] | null {
  const normalized = value.trim().toLowerCase()
  if (
    !normalized ||
    normalized === 'none' ||
    normalized === 'transparent' ||
    normalized === 'currentcolor' ||
    normalized === 'inherit' ||
    normalized.startsWith('url(') ||
    normalized.startsWith('var(')
  ) {
    return null
  }

  if (normalized.startsWith('#')) return parseHexColor(normalized)
  if (normalized.startsWith('rgb')) return parseRgbColor(normalized)
  return parseNamedColor(normalized)
}

function isPerceptiblyColored(rgb: [number, number, number]): boolean {
  const [r, g, b] = rgb.map((channel) => channel / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1))

  return saturation >= 0.18 && lightness >= 0.08 && lightness <= 0.92
}

export function svgHasColor(svg: string): boolean {
  const values: string[] = []
  const attrPattern = /\b(?:fill|stroke|stop-color|color)=["']([^"']+)["']/gi
  const stylePattern = /\b(?:fill|stroke|stop-color|color)\s*:\s*([^;"'}]+)/gi
  let match: RegExpExecArray | null

  while ((match = attrPattern.exec(svg)) !== null) {
    values.push(match[1])
  }

  while ((match = stylePattern.exec(svg)) !== null) {
    values.push(match[1])
  }

  return values.some((value) => {
    const color = parseCssColor(value)
    return color ? isPerceptiblyColored(color) : false
  })
}
