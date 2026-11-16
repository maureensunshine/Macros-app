# Mo's Dash

A one-page phone dashboard: Arizona clock, weather, stocks, label check,
raw-to-cooked converter, unit conversion, calendar, calculator, time zones.

## Files

| File | What it does |
|---|---|
| `index.html` | The whole app |
| `matcher.js` | Label Check's brain: reads the avoid list and checks ingredients |
| `avoid-list.txt` | Starter avoid list (only used the first time, or on "Reset to starter") |
| `manifest.json` | App name, icon, and the long-press "Label Check" shortcut |
| `icon-192.png`, `icon-512.png`, `icon.svg` | The Mo icon |
| `api/quote.js` | Stock price proxy (holds the Alpha Vantage key server-side) |

## Updating

Upload changed files to GitHub. Vercel redeploys on its own. Your calendar,
stocks, avoid list and pinned cities live on the phone and survive updates.
Use **Back up my data** at the bottom before reinstalling anything.

## Time zones

BC, Alberta, Manitoba and the NWT stopped changing clocks in 2026. Phones
may still carry the old rules, so those zones use fixed offsets in
`TZ_OVERRIDES` inside `index.html`. If more places change, add them there.

## Label Check

- **Barcode:** Open Food Facts (free, crowd-built). Gives ingredients,
  gluten-free labels and "may contain" traces when someone entered them.
- **Photo:** Tesseract.js reads the label on the phone. First use downloads
  the reader, so be online. Close, flat, no glare.
- **Avoid list format:** `Name: term, term, !exception`. Start a line with
  `?` for a "maybe" rule. Plurals and capitals are handled automatically.

## Vercel environment variable

- `ALPHA_VANTAGE_KEY` = your Alpha Vantage key
