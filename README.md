# Flip Dashboard

Persoonlijke flip portfolio tracker voor Pokemon, LEGO, sportskaarten en andere collectibles. PWA — installeerbaar als app op iPhone.

## Snel beginnen (lokaal testen)

```bash
npm install
npm run dev
```

Open http://localhost:5173 in je browser.

## Deploy naar Vercel + iPhone (3-staps proces)

### 1. Push naar GitHub

In Cursor's terminal of via GitHub Desktop:
```bash
git init
git add .
git commit -m "Initial flip dashboard"
git branch -M main
git remote add origin https://github.com/JOUW-USERNAME/flip-dashboard.git
git push -u origin main
```

### 2. Verbind met Vercel

1. Ga naar https://vercel.com/new
2. Importeer je GitHub repo
3. Klik "Deploy" (geen settings nodig, Vercel detecteert Vite automatisch)
4. Wacht 30 sec — Vercel geeft je een URL zoals `flip-dashboard.vercel.app`

### 3. Installeer op iPhone als app

1. Open de Vercel URL in **Safari** (niet Chrome)
2. Tap de Deel-knop (vierkant met pijl omhoog)
3. Scroll en tap **"Zet op beginscherm"**
4. Bevestig — er verschijnt nu een Flip-icoon op je beginscherm
5. Open het — voelt als een echte app (geen browser-balk, full screen)

## ⚠️ BELANGRIJK: Backup-strategie

**iOS verwijdert PWA-data na 7 dagen inactief gebruik.** Als je de app langer dan een week niet opent, kun je je hele portfolio kwijtraken.

**Maak elke 1-2 weken een backup:**
1. Open de app → Account-tab
2. Tap "Exporteer data" — krijgt een JSON-bestand
3. Sla op in iCloud Drive of mail naar jezelf
4. Bij verlies: Account-tab → "Importeer data" → kies het JSON-bestand

De app waarschuwt je hierover bovenaan de Account-tab.

## Content updates (elke 3 maanden)

Alle marktdata zit in **één bestand**: `public/marketplace.json`.

Workflow:
1. Vraag Claude: "geef me nieuwe marketplace.json met huidige prijzen en nieuwe releases"
2. Vervang het hele bestand in `public/marketplace.json`
3. Commit + push:
   ```bash
   git add public/marketplace.json
   git commit -m "Marketplace update Q3 2026"
   git push
   ```
4. Vercel detecteert de wijziging en deployt binnen 30 sec automatisch
5. De app heeft **cache busting** (`?v=YYYYMMDDHH`) ingebouwd — nieuwe data wordt direct opgehaald, jouw portfolio blijft 100% intact

De "Data laatst geüpdatet" badge in de Account-tab toont automatisch de datum uit `marketplace.json`.

## Wat zit erin

### Marketplace tab
- 67 collectibles met 5-sterren prioriteit-rating (eerlijk gekalibreerd: 8× 5⭐, 28× 4⭐, 24× 3⭐, 6× 2⭐, 1× 1⭐)
- 9 geverifieerde items met NL/EU bronnen
- Compacte filterstrip + uitklapbaar filterpaneel (zoeken, categorie, prijs, prioriteit, betrouwbaarheid)
- Filter-state blijft bewaard bij teruggaan uit detail-view
- Confidence dots: 🟢 geverifieerd / 🟡 schatting / 🔴 speculatief
- Bron-links per geverifieerd item
- Foto upload (camera + galerij)

### Portfolio tab
- Sub-tabs: **ACTIEF** | **VERKOCHT** (met item counters)
- Items standaard ingeklapt: thumb + naam + `qty × prijs = totaal` + chevron
- Direct zichtbaar per item: aantal-stepper + "Markeer Verkocht"-toggle
- Uitgeklapt: aankoopprijs (met advies-diff), datums, verkoopprijs, ROI%
- Statistieken in header:
  - Ingekochte waarde (actieve items)
  - Verwachte waarde + verwachte winst %
  - Gerealiseerde omzet + gem. winst %
  - Gerealiseerde winst (groen/rood)
- Optioneel "ALL-TIME STATS" panel: ooit gekocht, ooit waarde, all-time winst
- Aankoopdatum auto-tracked bij toevoegen, verkoopdatum bij markeren
- Verwijder-knop voor items uit "Verkocht"-historie (2-tap bevestig)

### Kalender tab
- Alle releases en retirements chronologisch
- Filterbaar per maand
- iPhone Agenda export via .ics download per item

### Account tab
- ⚠️ iOS PWA waarschuwing
- Exporteer/Importeer data (JSON backup)
- Opslaggebruik-indicator (waarschuwt bij > 80% van 5MB)
- Strategie & Tips (6 categorieën)
- Marketplace data-status met counts geverifieerd/schatting/speculatief

## Bestandsstructuur

```
flip-dashboard/
├── public/
│   ├── marketplace.json   ← Alle product/prijs data (vervang elke 3 mnd)
│   ├── icon.svg           ← App icoon
│   └── manifest.json      ← PWA manifest (iPhone home screen)
├── src/
│   ├── App.jsx            ← Alle React code in 1 bestand
│   ├── main.jsx           ← Entry point
│   └── index.css          ← Globale styles
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

Het hele project zit bewust in één App.jsx zodat je het makkelijk kan zoeken/editen in Cursor (Cmd+F voor alles).

## Lokale data

Portfolio data wordt opgeslagen in `localStorage` van je browser. Voor iPhone PWA: per app-installatie. Foto's worden als base64 in dezelfde storage opgeslagen.

**Storage limiet: 5MB** — De app waarschuwt je bij > 80% gebruik. Bij veel foto's kun je oude foto's verwijderen om ruimte vrij te maken.

## Tech stack

- **React 18** met Vite 5 (build tool)
- **lucide-react** voor icons
- **localStorage** voor portfolio persistence
- **sessionStorage** voor filter-state behoud
- **Cache busting** op marketplace.json (`?v=YYYYMMDDHH`)
- Geen externe API's nodig — alles statisch geserveerd
- PWA-compatible (Apple touch icons, manifest, meta tags)

## Troubleshooting

**"De app laadt niet op iPhone"**
→ Hard refresh in Safari: tap-en-hou refresh-knop, kies "Herladen zonder cache"

**"Data wijzigingen verschijnen niet"**
→ Vercel deploy duurt 30-60 sec. Check status op vercel.com/dashboard. Daarna pull-to-refresh in de app.

**"Portfolio data weg"**
→ Waarschijnlijk iOS 7-dagen storage wipe. Importeer je laatste backup via Account-tab → Importeer data.

**"Storage vol"**
→ Account-tab toont gebruik. Verwijder foto's uit Marketplace-items, of verwijder oude verkochte items uit historie.

## Development

```bash
# Lokaal ontwikkelen
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Versie

v2.3 — Met Export/Import backup, iOS warning, cache busting, all-time stats, datum tracking, verwijder-functie, opslag-indicator, filter-state behoud, status migratie.
