# Abdullah Property Center — Real Estate Website

A multi-page real-estate website built for a local property business in Sargodha, Pakistan. Visitors can browse listings, filter by purpose/type/area, and send an enquiry that opens pre-filled in WhatsApp — no backend or database required.

 **Live site:** https://abdullahpropertycenter.netlify.app
**Author:** Amna Masood, Software Engineering student (5th semester)

## Why I built this

Abdullah Property Center had no online presence — enquiries only happened by phone or word of mouth. This site gives it a simple, fast, mobile-friendly front door that funnels every enquiry straight into WhatsApp, which is how the business already talks to clients.

## Tech stack

Plain HTML, CSS and JavaScript — no framework, no build step, no backend. Deployed as a static site on Netlify.

| Page | Purpose |
|---|---|
| `index.html` | Home / hero / featured listings |
| `properties.html` | Full listings with filters (purpose, type, area) |
| `about.html` | Business story and approach |
| `services.html` | Buying / selling / renting / investment services |
| `contact.html` | Contact details + WhatsApp enquiry form |
| `404.html` | Custom not-found page |

## How it was built

I used AI to generate the first version of the site, then reviewed and fixed it myself. I'm noting that openly here because I think what matters for a portfolio isn't whether AI wrote the first draft — it's whether I understood it well enough to find and fix what was wrong with it.

### Issues I found and fixed

- **Accessibility contrast** — the original gold accent color (`#b88643`) on white was only a 3.2:1 contrast ratio; WCAG AA needs 4.5:1 for normal text. Replaced it with a darker gold (`#8a5f2b`, 5.6:1) for text and buttons.
- **No visible keyboard focus** — links, buttons and form fields had no `:focus` style, so keyboard users couldn't see where they were. Added `:focus-visible` outlines across the site.
- **Missing form labels** — the purpose/type filters on the Properties page had no accessible label for screen readers. Added `aria-label` attributes.
- **Placeholder content left live** — the About page shipped with literal text like *"Founder name and professional bio can be added here once confirmed"*, and several images were captioned "TEMPORARY DEMO IMAGE" directly inside the SVG artwork (so changing the HTML `alt` text alone didn't remove it). Replaced both with real content.
- **Missing CSS rules** — about 14 classes used in the HTML (`contact-grid`, `service-list`, `value-grid`, `mini-points`, and others) had no matching CSS at all, so the Contact, Services and About pages rendered as unstyled, stacked text. Wrote the missing layout rules and re-tested every page as a screenshot before shipping.

### Security choices worth mentioning

- `js/script.js` builds listing cards with DOM APIs (`createElement`/`textContent`) rather than `innerHTML`, and every property record is validated in `normalizeProperty()` before it's rendered — so the code treats listing data as untrusted input, not just trusted config.
- `_headers` sets a strict Content-Security-Policy for the deployed site.

### SEO basics included

Open Graph tags, canonical URLs, JSON-LD structured data, `sitemap.xml`, and `robots.txt`.

## What's still a demo (not production-ready)

- All listings in `LOCAL_PROPERTIES` (`js/script.js`) are placeholder data — real prices, areas and photos still need to go in.
- No backend yet — see "Next steps" below.

## Next steps

- [ ] Replace demo listings with real property data and photos
- [ ] Add a property detail page (gallery, full description, share link)
- [ ] Connect a real backend (Supabase) instead of the hardcoded `LOCAL_PROPERTIES` array
- [ ] Reduce duplication — header/footer are currently copy-pasted across all 6 pages; a static site generator (Eleventy/Astro) would fix this
- [ ] Urdu language support

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static server (e.g. VS Code Live Server) — no build step needed.

## Screenshots

<!-- Add 2-3 screenshots or a short GIF here: homepage, properties page with filters, contact form -->
