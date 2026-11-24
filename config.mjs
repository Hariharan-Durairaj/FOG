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

  // Home page extras, controlled from this folder at the top of the OneDrive folder.
  // Inside it: a Word document named "Key contacts" (table: Name | Number | Note),
  // one named "Quick access" (a list of page titles) and any other Word documents,
  // which are shown as highlighted cards (for example a seasonal safety message).
  home: { folder: 'Home page', contacts: 'Key contacts', quickAccess: 'Quick access' },

  // Added to 8-digit local phone numbers so they can be dialled from a mobile.
  phoneAreaCode: '08',

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

  // Web shortcuts (.url files): a linked PDF is downloaded at build time and shown like
  // any other PDF. Other links become a page with a button to open the website.
  links: {
    timeoutSeconds: 60,
    maxMegabytes: 50,
    // Apps opened from the My location page
    what3words: {
      web: 'https://what3words.com/products/what3words-app',
      ios: 'https://apps.apple.com/au/app/what3words/id657878530',
      android: 'https://play.google.com/store/apps/details?id=com.what3words.android',
    },
    emergencyPlus: {
      web: 'https://emergencyplus.com.au/',
      ios: 'https://apps.apple.com/au/app/emergency-plus/id691814685',
      android: 'https://play.google.com/store/apps/details?id=com.threesixtyentertainment.nesn',
    },
  },
  // The what3words address lookup appears only when the build has the key in the
  // environment variable FOG_W3W_KEY (never store the key in this file).

  colours: { theme: '#14213d', background: '#f5f3ef' },
};
