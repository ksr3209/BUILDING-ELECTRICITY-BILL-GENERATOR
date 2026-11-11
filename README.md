# Building Ledger

Run `start-app.cmd` and open http://127.0.0.1:8765. Python 3 is required for this launcher. The app itself has no build or package dependencies. Keep the folder together: index.html, styles.css, modern-ui.css, print-design.css, voucher-design.css, print-selection.css, features.css, drive-backup.css, bill-messaging.js, bill-messaging.css, core.js, print-design.js, print-selection.js, features.js, drive-api.js, drive-backup.js, app.js, manifest.json, sw.js and icon.svg. Keep GOOGLE-DRIVE-SETUP.md alongside the app for its setup link.

## Guest mode

Start using the app as a **Guest** without a Google account, OAuth setup or internet connection. Billing, payments, monthly records, printing and local JSON backup/import remain available. Records save in this browser while browser storage is available; keep JSON exports before clearing it or changing devices.

Choose **Use guest mode** in Settings to disconnect this tab from Google and remember the preference on this device. Your ledger and existing Google backups are kept. Guest mode prevents automatic Google sign-in loading on later visits until you choose Connect Google account again. It uses your existing ledger, with no separate sample records or sign-in gate.

## Monthly workflow

1. Settings: set building name/address. Tenant bills: set shared rate and due date.
2. Enter previous/current readings. Select a flat name for phone, rate override, opening arrears or optional service/gas/water/common/late fees. Blank custom rate uses the shared rate; zero is a valid custom rate.
3. Main meter: enter readings and check the tariff/connection settings. Optional actual-bill override is used in reconciliation.
4. Review/finalize locks charges and readings, including late fees as of the finalization date. Payments remain available. Reopening is deliberate and may change issued bills.
5. Use the payment icon to record a payment/date and print its receipt. Paid/Partly paid/Unpaid is calculated from payments, never a manual status that could disagree with the balance.
6. Print/share bills: select the visible details, preview, then Print / Save PDF. Choose Save as PDF in your browser. WhatsApp opens a text draft addressed to the saved phone; you send it yourself. To send a PDF, save it first and attach it in WhatsApp.
7. Start next month copies current readings to previous (new current starts equal to previous), snapshots unpaid balances as arrears, retains flat rates/extra charges, clears payments and due date, and finalizes the old month. History opens any month. Later months are never overwritten.

## Data and calculations

- Records live in this browser and origin only. Same host/port matters: file://, localhost and 127.0.0.1 use different storage. Back up before moving devices or clearing browser data. Optional Google Drive backups can be restored on another device using the same Google account and OAuth client configuration.
- JSON backup includes all months and personal information; keep it private. Import validates before replacement and downloads the current in-memory records first. CSV is for Excel/reporting; restore uses JSON.
- If stored records cannot be read, the original text is retained and Export backup downloads a recovery JSON instead of replacing it with empty records. A conflicting save from another tab pauses this tab before it can overwrite the newer records; export unsaved work if needed, then reload.
- v2 data migrates when it exists at the same origin; the old key is retained. Imported legacy tariff edits stay untouched until a preset is explicitly applied. Original app source is preserved as `original-v2.html`.
- Carry-over is a snapshot. Changes to an older month's charges/payments require manual review of later arrears. There is no automatic cross-month reassignment of payments.
- Each money line rounds to 2 decimals. Nearest-taka rounding is optional. Its adjustment is hidden on tenant slips, vouchers and shared bill text; the final total still includes it. Overpayments are prevented for new payments; resolve imported credits before carry-over.
- Late fees apply after the due date only when the bill was not settled by that date. A finalized month freezes late-fee eligibility as of finalization; reopen deliberately to recalculate it.
- Unit reconciliation is main consumption minus tenant consumption. Money reconciliation compares main cost with tenant **energy** charges, excluding arrears and other fees. Positive is a shortfall; negative is a surplus. It does not automatically add a shared charge. Enter each flat's common-electricity share explicitly.
- Residential June 2026 defaults: 4.63 (lifeline), 5.26, 8.50, 9.10, 9.62, 15.01, 17.35. Source: https://dpdc.gov.bd/pages/static-pages/6922de6f933eb65569e1a9c4 . Confirm applicable tariff and demand/rent/VAT/rebate treatment against the official bill. This is an estimate, not DPDC account integration.
- PWA caching requires localhost or HTTPS and an initial online load. Installation support varies by browser. Google Drive backup is optional and requires a configured Web OAuth client plus internet access. Automatic sending and a payment gateway are not included.

## Checks

`node --test tests/core.test.js tests/helpers.test.js tests/drive-api.test.js` checks calculations, data validation, monthly helpers and mocked Drive transport. `node --check app.js` and `node --check drive-backup.js` check syntax. `tests/drive-ui.mjs` exercises the connection/backup/restore controls with synthetic OAuth and Drive responses; it does not access a real Google account.

## Modern interface and reference PDF layout

The app now uses an original blue meter-and-building logo and an Apple-inspired interface: platform fonts, rounded navigation, grouped monthly totals, clear reading controls and responsive phone cards. The two main tabs are retained. Motion is limited to immediate button feedback and respects reduced motion.

Print studio has an independent **PDF language: English / বাংলা** selector. Bangla output uses Bangla display numerals; the interface language is unchanged. The Main meter tab also exposes PDF language beside Print summary.

The print template follows the supplied statement/slips design: navy table headers, three statement summary boxes, pale alternating rows, totals, notes, and two-column dashed cut-out slips. Each slip repeats its building, flat and month. Custom rates are printed when rate visibility is enabled. Optional fields and signatures remain configurable. Include master statement combines the ledger statement and tenant slips; disable it to print slips alone. Disable two-column slips for full-page tenant bills.

Pagination adapts to selected details and note length; it does not force long bills into a fixed number of tiny slips. For a clean PDF, turn off the browser's own Headers and footers option and choose A4 / Save as PDF. The app can cache the new style files after one online load.

`node tests/print-layout.mjs` is a local QA script using the installed skill CDP helper: it checks independent English/Bangla output, field visibility, equal mobile/desktop pagination, receipts, main summaries and long populated bills. The app has no runtime dependency on that helper.

## Tenant slips — Individual Payment Vouchers

On Tenant bills, **Tenant slips** is directly beside **Reading sheet** at the bottom of the readings list.

- Tenant slips opens **Print & PDF center** in Individual Payment Vouchers mode. A4 output uses three columns and up to five rows: **15 standard vouchers per page** in English or Bangla. Thirty standard records use two pages. Standard records include the default signature lines.
- Reading sheet now opens the same center with the master statement selected, so you can choose its PDF language before printing.
- Print / share bills and each flat's preview retain detailed tenant bills. The print-layout selector lets you switch between vouchers, detailed bills and the reading sheet for all-flat output.
- Vouchers repeat building/logo, flat, month, readings, selected rates/charges, due date, balance, reference and status. The footer identifies these as payment requests, not payment receipts. Actual receipts are generated from recorded payments.
- Long selected names, notes or extra-charge details can reduce the number per page. Content is measured at A4 width; the maximum stays 15 and phone/laptop produce identical page groups. If a single voucher is too long for A4, printing is blocked with instructions to hide its footer note or choose a detailed bill. No content is silently cut off.
- The center shows the calculated voucher page count, English/Bangla output selection and document field controls. Use A4 and 100% scale in the browser print dialog, and disable browser headers/footers.

All bill formats share the updated document identity and navy paper style. The main-meter printout clearly separates its calculator estimate from any official-bill override. Receipts show the actual payment date and omit collection due dates. Credit balances display as positive **Credit available** rather than negative amounts due; statements distinguish amount due, credits and net balance. References extend matching ID prefixes to avoid duplicate printed bill numbers within a month.

Additional QA: `tests/vouchers.mjs` verifies physical PDF page counts, language, escaping, rich charges and 320px preview. `tests/bill-documents.mjs` verifies credit/net totals, document references, receipt metadata, layout switching and oversized-voucher recovery. These local QA scripts use the installed skill's CDP helper and are not runtime dependencies.

## Six everyday billing improvements

1. **Choose flats to print.** In Print & PDF center, use All flats, Unpaid balances (including partly paid), or Choose individual flats. Use the checklist's Select all toggle to clear/start a custom selection. Skip zero-total bills excludes only valid bills whose total is zero; it does not remove paid bills with a nonzero total. Invalid readings stay visible until corrected or explicitly excluded. The preview, voucher output and master statement all use the same selected records and totals. Nothing selected means printing stays disabled. Selection survives layout/language changes within the same month/target and resets when the context changes.
2. **Review carried arrears.** New carry-overs save their source balance. If the earlier month later changes, a persistent banner identifies affected later months. Review opens source/target links and compares the stored opening arrears with the amount that would carry now. Keep current opening arrears records an acknowledgment only; it does not change any charge, payment or finalized bill. Missing/invalid source records must be resolved first. Older backups without provenance are compared with their current opening arrears and are explicitly identified as inferred. Later months never update silently.
3. **Check unusual consumption.** A reading warning appears when units are at least twice the average of up to three previous valid, nonzero months for that flat, with at least 50 extra units. Invalid/current-zero readings and missing/zero-only baselines do not produce this alert. It asks you to verify; it never changes or blocks a legitimate high reading.
4. **Backup reminders.** A reminder appears when no backup is recorded, the last backup is older than seven days, or a month was finalized/rolled over after it. Settings distinguishes a local JSON download request from a successful Google Drive backup, with date/time in Bangladesh time. Autosave and CSV exports do not mark a backup. Browser code can request a download but cannot guarantee where the file was saved: retain the JSON. Recovery exports preserve unreadable source text without marking a healthy backup.
5. **Enter-to-next reading.** From a current-reading input, Enter validates the row and moves to/selects the next visible, editable current reading. Search-hidden rows and disabled finalized fields are skipped. An invalid reading holds focus; the last visible row announces completion without claiming an unverified save.
6. **Flat account history.** Use Account history below a flat's name to see saved months, usage, bill totals, actual payments and remaining balance/credit. Open month navigates to the selected record. History follows the saved flat ID rather than matching names, so two flats with the same name are not combined. Latest balance is a month snapshot; monthly balances are not summed because carried arrears would be counted twice. Invalid readings show Check reading / — while recorded payments remain visible.

All six features work locally and are included in offline caching. Optional Google Drive backup/restore is described below; local autosave does not upload automatically.


## Google Drive private backups

Settings now includes Google Drive backup in English and Bangla. Create one Web OAuth client in your Google Cloud project, enable Drive API, authorize the app origin, then paste the public client ID into Settings. Follow [GOOGLE-DRIVE-SETUP.md](GOOGLE-DRIVE-SETUP.md) for the complete steps. No client secret or Firebase project is required.

- **Connect Google account** requests only `drive.appdata` access and loads that account's backup list. Connecting does not replace local records.
- **Back up to Google Drive** creates a new full-ledger version in the hidden app-data folder. Existing versions are kept. Local reading/payment changes do not upload automatically.
- **Review & restore** validates the selected version and previews its building, date and month count. Confirmation requests a local recovery JSON download before replacing the device's ledger. Keep the recovery file. Restore does not merge ledgers or alter the saved Drive backup.
- Use the same client ID and account on every device. Restore before working and back up afterward; simultaneous editing is not synchronized.
- The public client ID is stored separately. Access tokens stay in the current tab's memory and are excluded from saved ledger records and backups. Use guest mode clears the tab connection; backups remain. Reloading or token expiry requires another explicit connection.
- Files are limited to 10 MB. The list contains up to 1,000 newest versions, shown 20 at a time. No remote pruning/deletion control is included. Keep independent local JSON exports too.

Google app-data files are hidden from the normal Drive file list and can be restored here. [Google's app-data guide](https://developers.google.com/workspace/drive/api/guides/appdata). Billing remains usable offline; Google connection and Drive operations need internet. A real OAuth client/account has not been supplied, so live authorization and Drive round trips remain unverified.


## Send a tenant bill by WhatsApp or SMS

Each tenant card now has direct **WhatsApp** and **SMS** buttons. Save a phone number once and click a channel to open a prepared bill message. Review it and tap **Send** in the messaging app. No messages are sent automatically, and opening a draft does not mark a bill sent or paid. This works in Guest mode without Google setup.

- Missing or invalid numbers open **Add tenant phone**. **Save & open** stores the number and continues to the selected channel. This contact-only update also works for finalized months; readings, charges and finalization stay unchanged.
- Local `01XXXXXXXXX`, international `+8801XXXXXXXXX` / `008801XXXXXXXXX`, formatted international numbers and Bangla digits are accepted. The app checks number format; the destination app determines whether the recipient can receive the message.
- Choose **Message language → English / বাংলা** above the tenant list, in an individual bill preview, or in **Settings → Bill messages**. It is saved independently of the app/PDF language: English messages use English numerals, and Bangla messages use Bangla numerals. The choice is included in JSON/Drive backups. Existing records without this preference initially take the app language, then keep that choice until changed.
- **SMS** now uses a short summary: building, flat, month, units, total, paid amount, balance or credit, and due date when present. English amounts use `Tk` and omit unnecessary decimal zeros. All charges and arrears remain included in the total; the summary does not list the detailed breakdown or footer note. It can still use multiple SMS messages, depending on length/characters and your messaging app.
- **WhatsApp, Copy bill text and system sharing** keep the detailed message and selected document-detail switches. All messages recalculate at click time. Rounding remains hidden. Invalid readings or applicable rate fields must be corrected first.
- Individual bill preview also provides **WhatsApp**, **SMS**, **Copy bill text**, and the existing system-share action. Copy uses the clipboard where supported; otherwise it shows selectable text for manual copying.
- SMS needs a compatible messaging handler. Its prefilled body may vary by device/app, particularly on Apple devices; use **Copy bill text** and paste if needed. Desktop computers may not have an SMS handler. Long/Bangla bills may use multiple SMS messages; check your operator's charges before sending.
- These actions share text. For a PDF attachment, use **Print / Save PDF**, then attach the saved file in your messaging app.

The WhatsApp link follows [WhatsApp's click-to-chat documentation](https://faq.whatsapp.com/5913398998672934). SMS uses the body parameter in [RFC 5724](https://www.rfc-editor.org/rfc/rfc5724.html); [Apple's archived SMS link reference](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/SMSLinks/SMSLinks.html) documents recipient-only links, so body prefilling is not guaranteed on every platform. Browser tests intercept both channels; no real tenant message was sent during QA.
