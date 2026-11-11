---
name: Building Ledger
description: An Apple-inspired workspace for monthly electricity bills and collections.
colors:
  ground: "#f4f6fa"
  surface: "#ffffff"
  subtle: "#edf1f7"
  rule: "#dfe5ee"
  control: "#7b8798"
  text: "#182338"
  muted: "#536175"
  primary: "#0957ce"
  primary-hover: "#0649b3"
  on-primary: "#ffffff"
  focus: "#0957ce"
  accent-soft: "#eaf2ff"
  accent-text: "#0957ce"
  positive: "#25603c"
  negative: "#a32430"
  warning: "#82500d"
typography:
  headline:
    fontSize: "32px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Nirmala UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  control: "10px"
  input: "9px"
  sheet: "18px"
  mobile-sheet: "16px"
  dialog: "22px"
spacing:
  small: "8px"
  medium: "16px"
  section: "24px"
  canvas: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.input}"
    padding: "9px 11px"
  navigation-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-text}"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sheet}"
---

# Design System: Building Ledger

## Overview

**Creative North Star: "A calm, modern billing workspace"**

The user requested an Apple-inspired redesign with an original logo. The working interface uses the platform system font, white grouped surfaces, restrained electric blue, native controls, and immediate feedback. The two primary destinations remain Tenant bills and Main meter; History and Settings are secondary. The previous achromatic identity is superseded by this user-requested redesign.

**Key Characteristics:**

- Original SVG meter-and-building mark in an electric-blue app icon.
- Rounded selected navigation, a single grouped financial summary, and labeled reading fields.
- Strong numeric hierarchy with tabular amounts and visible payment-status words.
- Responsive forms and native modal tasks, without decorative entrance sequences.
- Separate navy document styling for statements, detailed bills, and measured A4 payment vouchers.

## Colors

`styles.css` supplies the base roles. `modern-ui.css` overrides them for the app. Components consume semantic roles; one filled blue primary action carries the current view's emphasis. Green, red and amber accompany explicit payment-state/error text. Field boundaries use Control Slate and keyboard outlines use Focus Blue.

`print-design.css` owns a separate paper palette: navy #0f172a, supporting slate #475569, paper #ffffff, pale row fill #f5f8fb and rule #d9e1ec. The reference PDF's blue/green/violet summary markers are deliberately retained. The app color scheme does not recolor bills.

## Typography

Use the platform font stack in frontmatter, including Nirmala UI for Bangla. Body tracking is normal; large headings and figures tighten to -0.035em. App headings are 32px desktop and 28px mobile (26px at the narrowest width). Key figures are 32px desktop and 27px mobile. Body remains 15px; form controls use 16px on mobile to avoid input zoom. Repeated row and toolbar metadata use smaller supporting roles. Changing numbers are tabular.

Printed PDFs choose their own language independently of the app UI. Bangla output uses Bangla numerals. Tenant names and building identity remain as entered. Document type is specified in points and rendered using offline system fonts.

## Layout

The centered app shell has a 1328px maximum outer width with 32px desktop gutters. Header identity, navigation and main content share edges. Four metrics share one white grouped panel. Billing uses a flexible reading sheet, a 24px gap and a 292px settlement column; settlement stacks at 1150px. At 760px, margins become 16px, metrics use two columns, form groups stack and the ledger becomes labeled cards. A final 380px adjustment protects narrow navigation and figures. The UI is verified down to 320 CSS px.

Main meter shows the saved month, independent PDF language and Print summary together. Tenant slips sits beside Reading sheet in the ledger footer. Both lead to the Print & PDF center, where the output choice comes first: Individual payment vouchers, Detailed tenant bills, or Reading sheet / master statement for all flats. Independent English/Bangla PDF language and document visibility follow. A preview sits alongside the options on desktop and below on mobile; its action footer remains visible while content scrolls.

Record reminders occupy a vertical stack above the workspace, with compact copy and a clear action. Account history uses four financial columns on desktop and two on phones. At 480px and below, account-summary and carry-review amount labels stack above their values to preserve readable amounts. Print selection uses a bounded, scrollable checklist rather than expanding the dialog indefinitely.

## Elevation & Depth

Working sheets have no visible perimeter border and use the very subtle shadow `0 4px 20px #18233806`. Dialogs use `0 24px 80px #18233829` with a translucent #18233855 backdrop. Ordinary controls retain clear boundaries. No decorative glass or page background gradients are used; the authored SVG logo alone uses a blue tonal fill.

## Shapes

Controls are 10px rounded, inputs 9px, desktop sheets 18px, mobile sheets 16px, dialogs 22px desktop/20px mobile. The logo is a 64-unit SVG with a 17-unit corner radius. Native dialogs handle focus and Escape. Row actions have visible square surfaces and text alternatives.

## Components

Primary buttons use filled electric blue; secondary actions remain neutral. Press feedback begins through :active and is a small scale change only when reduced motion is not requested. Background and transform transitions take 120ms with ease-out. No input is blocked while an animation completes.

Reading fields retain stable alignment with adjacent units, balances and actions. Labels appear above the fields on phones. Paid/Partly paid/Unpaid remains a word below the balance, separate from the amount.

### Reading entry and usage warnings

Enter in a valid current-reading field moves focus to the next visible, editable current-reading field and selects its value. Invalid readings retain focus with a correction message; filtered-out rows, disabled fields, and finalized months are not advanced through. The last visible flat produces a status message rather than wrapping focus.

An advisory usage warning spans the tenant row when current usage is at least twice the average of up to three earlier valid, positive-usage months and at least 50 units above that average. Its amber text, ground fill, thin rule, and explicit comparison ask the user to verify the reading. The message is associated with the current-reading field and does not change the reading or bill.

### Carry-over review and backup reminders

Changed carry-over sources produce a pale-blue warning banner and a Review arrears action. The review dialog compares the opening arrears kept in the target with the current source balance and provides Open source and Open target actions. Keep current opening arrears explicitly acknowledges the reviewed source baseline; it does not rewrite any money. Missing or invalid source records require correction before acknowledgment.

Backup reminders appear when no export has been requested, the last request is more than seven days old, or a month has been finalized since the last export. The banner and Settings detail label the timestamp Last backup export requested, since requesting a download does not prove the file was saved. Export remains a local JSON download; no Google or other cloud sync is enabled.

### Flat account history

An Account history text action sits below each flat's identity. Its native dialog shows the latest recorded month and balance or credit, payments across the saved months, and monthly snapshots in reverse order. Each monthly record exposes units, bill total, paid amount, balance or credit, expandable payment dates and notes, and an Open month action. The accompanying explanation makes clear that carried arrears recur in later snapshots, so monthly balances must not be summed.

### Print selection

The Print & PDF center offers All flats, Unpaid balances including partly paid, and Choose individual flats. The optional Skip zero-total bills removes only valid bills whose total is zero; a fully paid bill with a nonzero total remains eligible. Custom selection provides native checkboxes, Select all listed flats, visible status words and balances, a scroll hint, and a live selected count. The selection is local to the print session and does not alter the ledger or backup records.

Preview, printed vouchers, detailed bills, and master-statement rows and totals all use the selected flats. Selection scope remains explicit on documents. An empty selection presents recovery copy and disables printing until at least one eligible flat is chosen. Independent PDF locale and field visibility continue to apply to the selected output.

### PDF statements and detailed bills

The statement follows the supplied reference: shared logo and building identity, billing metadata, three compact summary boxes, navy table header, alternate pale rows, strong total rule, billing notes, optional signature and shared footer. Actual per-flat rates can be shown. All figures come from the current ledger. Credits display as positive amounts explicitly labeled credit; a statement with credits separates amount due, credit balances, and net balance (due minus credit). Its table total is explicitly labeled Total / net balance.

Detailed tenant bills use two columns of dashed cut-out slips, or full-page bills when the compact option is disabled. Each bill repeats the logo, building/flat identity, billing month, bill reference, selected details, and balance or explicitly labeled credit. Cards are measured at A4 width before grouping into pages; phone and desktop yield the same page groups. Large notes or extra charges may require additional pages.

A4 margins are 14mm. A master statement can be included with detailed bills. Field-visibility switches affect presentation, not calculations. The PDF-language selector controls statements, vouchers, bills, receipts, and main-meter summaries independently of the UI language; Bangla output uses Bangla numerals. Browser Print / Save as PDF remains the export route at A4, 100% scale, with browser headers and footers disabled.

### Individual payment vouchers

The dedicated voucher output uses three columns and at most five rows per A4 page, with dashed cut lines, compact reading groups, explicit amount labels, and references. `voucher-design.css` reuses the paper palette. Vouchers are payment requests and their footer explicitly says they are not receipts. Each repeats the shared logo and building/flat identity; the page supplies the output heading and numbered footer.

Pagination measures the cards at A4 printable width before grouping rows. Normal details fit 15 vouchers on one page and 30 on two pages in English and Bangla. Longer notes or additional details produce fewer vouchers per page. The phone preview stacks cards without changing the measured print groups. A voucher too tall for one page blocks printing, shows a recovery message, and lets the user hide the footer note or choose Detailed tenant bills.

### Receipts and main-meter summaries

Receipts use the shared document logo, header, and footer, plus a strong amount-received panel. The header shows the actual payment date and omits the collection due date. Remaining balance or positive credit is explicitly labeled and reflects all currently recorded payments for that billing month.

Main-meter output labels the tariff calculation as an estimate. An actual official bill override appears separately as the amount used for reconciliation; it does not replace the displayed calculator result. Calculation notes explain the estimate and omitted utility arrears or surcharges.

## Do's and Don'ts

- Do preserve the two-tab workflow, user data and monetary calculations during visual changes.
- Do retain visible labels, focus outlines, recovery messages and confirmation for destructive actions.
- Do use semantic tokens and offline fonts; keep input feedback immediate.
- Do keep the reference PDF's visual style independent of the Apple-inspired app chrome.
- Do keep print scope explicit and calculate document totals from the selected flats only.
- Do not add decorative charts, invented statistics or animated page entrances.
- Do not treat hidden bill details as removed charges or change app language while rendering a PDF.
- Do not sum monthly account balances that repeat carried arrears or rewrite money when acknowledging carry-over review.


## Guest mode and private Drive backups

Guest mode is the default local workspace. The save indicator identifies guest use; Settings offers Use guest mode alongside the optional Google connection. Switching modes retains the same ledger and clears transient Google credentials. The remembered guest preference stays outside exported records and suppresses Google sign-in warm loading until an explicit connection.

The Drive settings section follows the existing two-column laptop settings rows and stacks at phone widths. Native setup details hold the public client ID and exact origin. Newest-first version rows display date, filename, size and Review & restore. Status messages distinguish loading, errors and successful manual backups. A native restore dialog previews the source building/month count, compares the local revision, and requests a local recovery download before replacement. All user/file text is escaped and controls support English and Bangla. Existing bills, print options and monetary calculations retain their current presentation.


## Direct tenant bill messaging

Each reading card has a full-width messaging footer containing its saved recipient and two visible text actions, WhatsApp and SMS. Reading columns retain their existing widths. Phone layouts stack the recipient above two equal actions with 44px targets; compact laptop actions use 36px targets. A shared hint explains that the messaging app opens a draft and the user presses Send. The contact-only dialog handles missing/invalid numbers without unlocking finalized financial inputs. Individual preview retains sharing/PDF controls and adds SMS plus a selectable-text copy fallback. Error/status copy distinguishes a requested draft from delivery.


### Short SMS and independent message language

The message toolbar above readings combines a short explanatory hint with an English/Bangla selector. It stacks at phone widths; the same saved preference is available under Bill messages in Settings and beside PDF language for individual bill previews. Those controls stay synchronized, with unique IDs. Message formatting uses local language/number/date formatters and never changes app or PDF preferences. SMS has a fixed compact summary; detailed WhatsApp/copy/system-share messages continue to use the document detail switches. English compact SMS uses ASCII Tk and trimmed fractional zeros, while Bangla uses Bangla numerals. Neither format shows a rounding line.
