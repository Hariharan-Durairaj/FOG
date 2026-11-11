# SASES FOG: guide for content editors

Everything in the app comes from the **FOG** folder in OneDrive. You change the app by changing that folder. No other tools are needed.

Changes appear in the app within about 15 minutes. Phones pick them up the next time the app is opened with a connection.

## How folders and files become the app

| In the FOG folder | In the app |
|---|---|
| A folder | A section on the home screen |
| A folder inside a section | A topic. Folders can go as deep as you need |
| A Word document (`.docx`) | A page. The page title is the file name |
| A folder that holds one Word document and no folders | Opens straight to that document |
| `icon.svg` or `icon.png` in a folder | The icon for that section. Topics without their own icon use the section's |
| Other pictures (`.jpg`, `.jpeg`, `.png`, `.webp`) in a folder | Shown with that folder's content |

Other file types (PDF, Excel, old `.doc` files) are ignored. Save old Word files as `.docx`.

## Order

Sections on the home screen and the topics inside each section are shown in **alphabetical order**.

You can still start names with a number (`01 Safety`, `02 First Aid`) to keep the folder tidy in OneDrive. The number is not shown in the app and does not change the order. (An administrator can switch the app back to number order in the settings.)

## Names with `/` or `:`

OneDrive does not allow `/` or `:` in names. Use these look-alike characters instead. The app shows them as the normal ones.

| You want | Copy and paste this |
|---|---|
| `/` | `∕` |
| `:` | `꞉` |

Example: `07 Anaphylaxis ∕ Allergic Reactions` is shown as "Anaphylaxis / Allergic Reactions".

## Drafts

Start a file or folder name with an underscore to keep it out of the app, for example `_Drafts` or `_Burns new version.docx`. Remove the underscore to publish it.

## Writing documents

Write in Word as usual. These carry over to the app:

- **Heading 1** and **Heading 2** styles. A document with three or more Heading 1 sections gets a contents list at the top.
- Bold, italic, underline and strikethrough.
- Bulleted and numbered lists.
- Tables, including cell shading (for colour-coded tables).
- Text colour, shading and highlighter colours (for warnings).
- Links and pictures. Add alt text to pictures where you can.
- The Title, Subtitle, Quote and Intense Quote styles. Intense Quote is shown as a highlighted box.

Tips:

- Use the Heading styles rather than large bold text. Headings make the contents list and help search.
- Keep tables narrow: three or four columns read best on a phone. Wider tables scroll sideways.
- Fonts, font sizes, page margins, headers and footers are not carried over. The app uses its own layout.
- Insert pictures as PNG or JPEG. Drawings pasted from other programs (EMF, WMF) and iPhone HEIC photos cannot be shown and are left out.

## Notes for future editors

You can leave instructions inside a document that never appear in the app or in its search:

- **Editor notes:** start a paragraph with `Editor note:` (for example `Editor note: Keep this table to three columns so it fits on a phone.`). The whole paragraph is left out of the app. `Note for editors:` also works.
- **Word comments:** comments added with *Review → New Comment* are never shown in the app.
- **Hidden text:** text formatted as hidden in Word (*Font → Hidden*) is left out.

Put editor notes at the top of the document so the next editor sees them first. Format them in grey italics so they stand out in Word.

## Icons

- Name the file `icon.svg` (preferred) or `icon.png` and put it in the section's folder.
- A simple single-colour outline works best. Black SVG icons are recoloured to match the app.
- PNG icons should be square, at least 192 × 192 pixels, with a transparent background.

## Home screen sizes

Sections with more topics get a bigger entry on the home screen: 6 or more sub-folders for a bigger entry, 12 or more for the biggest. You don't need to do anything for this.

## If something does not appear

- Wait 15 minutes, then open the app with a connection.
- Check the name does not start with `_`, `.` or `~$`.
- Check the file is a `.docx`.
- Close the document in Word so OneDrive finishes uploading it.
- If one document shows "This document could not be displayed", open it in Word, choose Save As, save it again as `.docx` and replace the file.
