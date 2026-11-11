// All site settings live here.
export default {
  siteName: 'SASES FOG',
  shortName: 'FOG',
  description: 'SASES Field Operations Guide',

  // OneDrive folder that holds the content (used by bin/sync.sh).
  oneDriveFolder: 'FOG',

  timeZone: 'Australia/Adelaide',
  locale: 'en-AU',

  // Order of the home screen entries: 'alphabetical' or 'folder' (number prefixes).
  // Topics inside sections always follow the folder order.
  homeOrder: 'alphabetical',

  // Home screen entry size, by number of sub-folders in the section.
  entrySizes: { biggerFrom: 6, biggestFrom: 12 },

  // On phones, sections below the bigger size whose names are short share a row in pairs.
  phonePairs: { halfMaxChars: 22, halfMaxWord: 10 },

  // Section pages show a filter box from this many topics.
  filterFrom: 10,

  // Document pages show a contents list from this many Heading 1 sections.
  contentsFrom: 3,

  images: { maxWidth: 1400, quality: 80 },

  colours: { theme: '#14213d', background: '#f5f3ef' },
};
