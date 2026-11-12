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

  // Pictures. Pictures no bigger than iconMax pixels (about 1.7 cm) in Word, such as
  // warning symbols, stay in the line of text.
  images: { maxWidth: 1400, quality: 80, iconMax: 64 },

  // PDFs are shown as one picture per page (phones cannot show a PDF inside a page),
  // with a link to the original. Pages after maxPages are only in the original.
  pdf: { maxPages: 60, width: 1400 },

  colours: { theme: '#14213d', background: '#f5f3ef' },
};
