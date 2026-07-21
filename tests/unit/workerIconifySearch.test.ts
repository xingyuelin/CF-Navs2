import { describe, expect, it } from 'vitest'
import {
  buildIconifyWorkItems,
  iconifyProxyPath,
  iconifyUrlFromParams,
  normalizeIconifyNamePair,
  normalizeIconifySearchQuery,
} from '../../worker/lib/iconifySearch'

describe('worker Iconify search helpers', () => {
  it('normalizes Iconify names, package names, and known API URLs', () => {
    expect(normalizeIconifySearchQuery('@iconify-json/logos/github-icon')).toBe('logos:github-icon')
    expect(normalizeIconifySearchQuery('iconify:logos:github-icon')).toBe('logos:github-icon')
    expect(normalizeIconifySearchQuery('https://api.iconify.design/logos/github-icon.svg?color=black')).toBe(
      'logos:github-icon',
    )
    expect(normalizeIconifySearchQuery(' h o m e ')).toBe('home')
    expect(normalizeIconifySearchQuery('x')).toBe('')
  })

  it('validates Iconify route params before building upstream URLs', () => {
    expect(normalizeIconifyNamePair('Logos', 'github-icon.svg')).toBe('logos:github-icon')
    expect(normalizeIconifyNamePair('bad/prefix', 'home')).toBeNull()
    expect(iconifyUrlFromParams('Logos', 'github-icon.svg')).toBe(
      'https://api.iconify.design/logos/github-icon.svg',
    )
    expect(iconifyUrlFromParams('bad/prefix', 'home')).toBeNull()
    expect(iconifyProxyPath('logos', 'github-icon')).toBe('/api/iconify/logos/github-icon.svg')
  })

  it('deduplicates search results and prioritizes palette collections', () => {
    const items = buildIconifyWorkItems('mdi:home', {
      icons: ['logos:github-icon', 'mdi:home', 'bad-name'],
      collections: {
        logos: { name: 'Logos', palette: true },
        mdi: { name: 'Material Design Icons' },
      },
    })

    expect(items.map((item) => item.name)).toEqual(['logos:github-icon', 'mdi:home'])
    expect(items[0]).toMatchObject({
      collection: 'Logos',
      palette: true,
    })
  })
})
