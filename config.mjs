// All site settings live here.
export default {
  siteName: 'SASES FOG',
  shortName: 'FOG',
  description: 'SASES Field Operations Guide',

  // OneDrive folder that holds the content (used by bin/sync.sh).
  oneDriveFolder: 'FOG',

  timeZone: 'Australia/Adelaide',
  locale: 'en-AU',

  // Order of the home screen and of the topics inside each section:
  // 'alphabetical' (A to Z, number prefixes ignored) or 'folder' (by number prefix).
  order: 'alphabetical',

  // Home screen entry size, by number of sub-folders in the section.
  entrySizes: { biggerFrom: 6, biggestFrom: 12 },

  // Laptops and desktops: entries per home screen row (the last row may have fewer),
  // and how much fits in a row (standard entry = 2, bigger = 3, biggest = 4).
  desktopRows: { min: 3, max: 4, maxWeight: 10 },

  // On phones, sections below the bigger size whose names are short share a row in pairs.
  phonePairs: { halfMaxChars: 22, halfMaxWord: 10 },

  // Section pages show a filter box from this many topics.
  filterFrom: 10,

  // Document pages show a contents list from this many Heading 1 sections.
  contentsFrom: 3,

  images: { maxWidth: 1400, quality: 80 },

  colours: { theme: '#14213d', background: '#f5f3ef' },
};
