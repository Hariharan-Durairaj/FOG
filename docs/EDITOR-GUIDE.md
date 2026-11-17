# SASES FOG: guide for content editors

Everything in the app comes from the **FOG** folder in OneDrive. You change the app by changing that folder. No other tools are needed.

Changes appear in the app within about 15 minutes. Phones pick them up the next time the app is opened with a connection.

## How folders and files become the app

| In the FOG folder | In the app |
|---|---|
| A folder | A section on the home screen |
| A folder inside a section | A topic. Folders can go as deep as you need |
| A Word document (`.docx`) | A page. The page title is the file name |
| A web shortcut (`.url`) | A page for that link: a linked PDF is downloaded and shown, other links get an *Open the website* button |
| A PDF (`.pdf`) | A page showing every page of the PDF, with an **Open the PDF** button. The page title is the file name |
| A folder that holds one document (Word or PDF) and no folders | Opens straight to that document |
| `icon.svg` or `icon.png` in a folder | The icon for that section. Topics without their own icon use the section's |
| Other pictures (`.jpg`, `.jpeg`, `.png`, `.webp`) in a folder | Shown with that folder's content |

Other file types (Excel, PowerPoint, old `.doc` files) are ignored. Save old Word files as `.docx`, or save them as PDF.

## Order

Sections on the home screen and the topics inside each section are shown in **alphabetical order**.

Name folders and files with just their title, for example `First Aid` or `Burns.docx`. There is no need to number them.

A number followed by a space, full stop, underscore or hyphen at the start of a name (`01 Safety`) is treated as an old-style order number and is not shown in the app. If a title really starts with a number, write it without a space after the number or spell it out, for example `Triple Zero calls` rather than `000 calls`.

## Names with `/` or `:`

OneDrive does not allow `/` or `:` in names. Use these look-alike characters instead. The app shows them as the normal ones.

| You want | Copy and paste this |
|---|---|
| `/` | `∕` |
| `:` | `꞉` |

Example: `Anaphylaxis ∕ Allergic Reactions` is shown as "Anaphylaxis / Allergic Reactions".

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
- Pictures are shown at the size you give them in Word (never wider than the screen). Tap a picture in the app to see it full screen.
- Small symbols, such as a warning triangle or danger sign at the start of a line, stay in the line of text, just as in Word. Keep them small in Word (under about 1.5 cm) and *In Line with Text* (*Picture Format → Wrap Text*).
- Insert pictures as PNG or JPEG. Drawings pasted from other programs (EMF, WMF) and iPhone HEIC photos cannot be shown and are left out.

## PDFs

- Use a PDF when a document must keep its exact layout (forms, posters, maps, scanned pages). For everything else Word is better: the text fits phone screens and can be edited.
- Each PDF page is shown as a picture people can tap to zoom. Its text is still found by search, unless it is a scan without text.
- Long PDFs are shown up to page 60; the rest is in the original, opened with **Open the PDF**.
- PDFs with a password cannot be shown.

## Web links to PDFs

To show a PDF that lives on another website (for example a contact directory that is updated elsewhere), add a web shortcut instead of a copy of the file:

- In File Explorer, right-click → *New* → *Shortcut*, paste the web address, and name it with the page title (for example `SA SES Contact Directory`). Or drag the address from the browser's address bar into the OneDrive folder.
- If the address points to a PDF, the app downloads it each time the guide is updated and shows it like any other PDF, including offline and in search. A *Source* link shows where it came from.
- If the address points to an ordinary website, the page shows an **Open the website** button. That needs an internet connection.
- If the PDF cannot be downloaded, the page says so and links to the original.

## Home page

The **Home page** folder at the top of the FOG folder controls the extras at the top of the app's home screen. It is not shown as a section.

| File in `Home page` | On the home screen |
|---|---|
| `Key contacts.docx` | Tap-to-call phone numbers. Use a table with the columns **Name**, **Number**, **Note**, and optionally **Email** (the first row can be headings). Each contact gets a call button, and an email button when the row has an email address (in the Note or Email column). A contact can have just an email. Local 8-digit numbers get the 08 area code automatically. |
| `Quick access.docx` | Buttons to the most-used pages. Write one page title per line, as it appears in the app. If two pages share a title (such as Resources), write `Section › Page`, for example `First Aid › Resources`. |
| Any other Word document | A highlighted card, titled with the file name, for example `Heat safety.docx`. Use it for seasonal or urgent safety messages. Delete the file (or start its name with `_`) to remove the card. |

Keep cards short: they appear above everything else on a phone.

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
- Check the file is a `.docx`, `.pdf` or web shortcut (`.url`).
- For quick access buttons, check the page title is spelled exactly as in the app. Titles that do not match are skipped.
- Close the document in Word so OneDrive finishes uploading it.
- If one document shows "This document could not be displayed", open it in Word, choose Save As, save it again as `.docx` and replace the file.
