export default {
  siteName: 'SASES FOG',
  shortName: 'FOG',
  description: 'SASES Field Operations Guide',
  themeColor: '#13293d',
  backgroundColor: '#f3f4f6',
  timeZone: 'Australia/Adelaide',
  locale: 'en-AU',

  // Tile size on the home and section pages, based on the number of sub-folders.
  tiles: { wideFrom: 6, largeFrom: 12 },

  // Colours given to top-level sections in order. Sub-sections inherit their parent's colour.
  palette: [
    '#c2410c', '#b91c1c', '#1e3a5f', '#0f766e', '#334155', '#1d4ed8', '#7c2d12', '#3f6212',
    '#5b21b6', '#0e7490', '#a16207', '#9f1239', '#166534',
  ],

  images: { maxWidth: 1400, quality: 80, cover: { width: 960, height: 640, quality: 78 } },
};
