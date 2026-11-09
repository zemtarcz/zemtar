# GTS Minibagr

Landing page pro pronájem minibagru Komatsu PC38MR s obsluhou a dopravou (G.T.S. Poběžovice). Zadání: [`BRIEF.md`](BRIEF.md).

## Spuštění

```bash
bun install
bun run dev
```

Build:

```bash
bun run build
bun run start
```

## Výměna podkladů

Surové snímky / stills dejte do `raw/` (je v `.gitignore`).

```bash
# dig sekvence ze složky raw/2
bun run frames:dig

# underground ze složky raw/3
bun run frames:underground

# statické obrázky (Dreamina / WhatsApp / …) – mapování v scripts/convert-stills.mjs
bun run stills
```

Skript `scripts/convert-frames.mjs` zapisuje `0001.webp…` + `manifest.json` (a volitelně `-mobile`). Web čte počty snímků z manifestu, nehardcoduje je.

## Ukázková data k nahrazení

Všechna kontakty, ceny, IČO a podobně jsou v [`content/site.ts`](content/site.ts) s `example: true` / helperem `ex()`.

V `development` (a při `NEXT_PUBLIC_SHOW_PLACEHOLDERS=1`) jsou v UI žlutě přerušovaně podtržená.

Checklist před spuštěním: **BRIEF kap. 9**.

## Rozhodnutí

- Package manager: **bun** (`bun run build`).
- App Router bez `src/` – struktura dle BRIEF 6.2.
- Mapa oblasti: jednoduché SVG (`public/map/oblast.svg`), ne DEM/gdal pipeline (TODO při potřebě přesnější mapy).
- Nákladák: mezi FAQ a kontaktem.
- Hero kompozice: dle `assets-start/mockup-hero-stred.png` + `object-position: 40% 100%` na videu.
- Preview/non-production: `robots` noindex (`VERCEL_ENV !== production`).
- Odesílání poptávek: EmailJS (`EMAILJS_SERVICE_ID` / `TEMPLATE_ID` / `PUBLIC_KEY` / `PRIVATE_KEY`), jinak Resend, jinak `mailto:` fallback.
- Deploy na Vercel: ručně (projekt připraven).
- Lighthouse: v tomto prostředí nebyl dostupný Chrome/Chromium (ani Playwright download). Spusťte lokálně: `npx lighthouse http://localhost:3000 --form-factor=mobile --view`.

## Struktura

- `app/` – layout, page, actions, SEO
- `components/sections` – sekce stránky
- `components/motion` – Lenis, ScrollSequence, hooky
- `content/site.ts` – obsah
- `public/` – hero, seq, textury, truck, brand, fotky
- `scripts/` – převod snímků
