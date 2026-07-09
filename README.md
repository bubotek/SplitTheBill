# Split the Bill

Scan a receipt, tap what you ordered, see exactly what you owe — tax and tip included.

**[split.bubotek.com](https://split.bubotek.com)** · free, no account, no download.

## Nothing leaves your phone

There is no backend. No server, no database, no API keys, no analytics, no AI model.
The whole app is one HTML file that runs in your browser.

The receipt photo is read on-device by [Tesseract.js](https://tesseract.projectnaptha.com/),
an open-source OCR engine. The parsed lines are matched by hand-written rules — no model
call, no upload. Your bill is kept in `localStorage` on your own device, so you can close
the tab mid-dinner and pick up where you left off.

You can verify all of this by reading [index.html](index.html). That is the point of
publishing it.

## For restaurants

Free to use, free to hand to your guests. Put a QR code on the table and skip the part of
dinner where five people do arithmetic. Contact us at [bubotek.com](https://bubotek.com).

## Running it locally

No build step, no dependencies.

```
npx serve .
```

Then open the URL it prints. Opening `index.html` from the filesystem works too, though
the service worker needs a real HTTP server.

## Stack

Vanilla JS, inline CSS, one HTML file. PWA manifest and service worker for offline use.
Deployed as static files on Vercel.

---

Built by [BuBoTek](https://bubotek.com) — we ran restaurants, now we automate them.
