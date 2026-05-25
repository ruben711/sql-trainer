# SQL Trainer — Zoekertje Exam Prep

Een **Vercel-first** Next.js app om realistisch te oefenen voor je SQL-examen.
Twee modi: **Examen (Zoekertje-DB)** en **Algemene SQL (Classics-DB)**.
Volledig in de browser via `sql.js` — geen server, geen account, geen kosten.

---

## ✨ Features

- 🎓 **Examen-modus** — Zoekertje-database uit jouw cursus (Categorie/Rubriek/Afdeling, Zoekertje, Bod, Foto, Kleur/Materiaal M:N, …)
- 🧠 **Algemene SQL-modus** — Classics-DB (customers, orders, products, employees) voor basis tot gevorderd
- ⚡ **Auto-grading** — vergelijkt resultaatsets, niet syntax (orde-onafhankelijk tenzij `ORDER BY` vereist is)
- 💡 **Didactische feedback** — wijst op te veel/te weinig rijen, kolom-aliassen, NULL-fouten, ambigue kolommen, …
- 🕒 **Examensimulatie** — random vragen, timer, score, modeloplossingen achteraf
- 📊 **Dashboard** — XP, streaks, badges, voortgang per mode
- 🔎 **Schema-viewer** — alle tabellen, types, DDL en sample-data
- 🎨 **Monaco editor** met SQL-highlighting + Ctrl/Cmd+Enter shortcut
- 💾 **localStorage** — voortgang per mode persistent, per device

---

## 🚀 Snel starten (lokaal)

```bash
git clone https://github.com/<jij>/sql-trainer.git
cd sql-trainer
npm install         # kopieert ook automatisch sql-wasm.wasm naar /public
npm run dev         # → http://localhost:3000
```

Geen `.env` nodig voor de basis-app.

---

## ☁️ Deployment op Vercel (aanbevolen)

1. Push naar GitHub:
   ```bash
   git init && git add . && git commit -m "init"
   git remote add origin https://github.com/<jij>/sql-trainer.git
   git push -u origin main
   ```
2. Ga naar [vercel.com/new](https://vercel.com/new) → **Import** je repo
3. Framework wordt automatisch gedetecteerd (Next.js). Geen env vars nodig.
4. Klik **Deploy** — klaar, je hebt een live URL ✅

Elke `git push` → automatische redeploy. Pull requests krijgen preview-URLs.

### Alternatieve hosts
- **GitHub Pages** — zet `output: 'export'` aan in `next.config.js`, run `npm run build`, push `out/` naar `gh-pages`
- **Netlify** — werkt out-of-the-box
- **Docker / VPS / Railway** — gebruik de meegeleverde `Dockerfile`

---

## 🏗️ Architectuur

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel Edge / CDN (statische assets + Next.js)             │
│  - HTML, JS, CSS                                            │
│  - /sql-wasm.wasm (gecached 1 jaar, immutable)              │
│  - /seed.zoekertje.sql, /seed.classics.sql                  │
└─────────────────────────────────────────────────────────────┘
                       ↓ fetch (1× per modus, dan cached)
┌─────────────────────────────────────────────────────────────┐
│  Browser — geïsoleerd per gebruiker                         │
│  - sql.js: SQLite in WebAssembly                            │
│  - DB wordt opgebouwd uit seed.sql (in-memory)              │
│  - Grader vergelijkt query-resultaat met modeloplossing     │
│  - Zustand + localStorage: XP / voortgang per mode          │
└─────────────────────────────────────────────────────────────┘
```

### Folderstructuur

```
├── app/                  # Next.js App Router pagina's
│   ├── layout.tsx        # globale navigatie + ModeSwitcher
│   ├── page.tsx          # landing
│   ├── dashboard/        # XP, streaks, voortgang
│   ├── exercises/        # lijst + detailpagina per oefening
│   ├── playground/       # vrije SQL playground
│   ├── exam/             # examensimulatie met timer
│   └── schema/           # schema-viewer
├── components/           # UI: editor, resultaattabel, mode-switcher, …
├── lib/
│   ├── db.ts             # sql.js init, getDatabase(mode), runQuery
│   ├── grader.ts         # compareResults, gradeQuery, hints
│   ├── exercises.ts      # mode-aware loader
│   ├── modes.ts          # mode-config + zustand store
│   └── store.ts          # voortgang per mode (persisted)
├── data/
│   ├── exercises.zoekertje.json   # ~35 oefeningen op de examen-DB
│   └── exercises.classics.json    # 18 algemene SQL oefeningen
├── public/
│   ├── seed.zoekertje.sql         # DDL + seed van de examendatabase
│   ├── seed.classics.sql          # DDL + seed van Classics
│   └── sql-wasm.wasm              # SQLite-engine (auto-gekopieerd)
├── scripts/copy-wasm.js  # postinstall: kopieert wasm naar /public
├── styles/globals.css    # Tailwind + theme
└── vercel.json           # caching-headers voor wasm + seed
```

---

## 🔐 Veiligheid & schaalbaarheid — eerlijk antwoord

### Kan ik dit veilig delen met vrienden?

**Ja, 100% veilig.** Dit is geen SQL-playground met een gedeelde server-DB; het is een SQL-engine die in elke browser opnieuw start. Concreet:

- ✅ **Geen SQL-injectie mogelijk** — geen server om te injecteren
- ✅ **Geen DoS mogelijk** — een trage query van bezoeker A vertraagt enkel bezoeker A's eigen tab
- ✅ **Geen kosten-explosie** — Vercel serveert enkel statische bestanden
- ✅ **Geen data-lek** — er ís geen data
- ✅ **Niet kapot te maken** — bij elke load wordt een verse DB gebouwd; reset-knop binnenin

Het enige reële randgeval: iemand schrijft een `WITH RECURSIVE`-bom en zijn eigen tab vriest 5 seconden. Workaround: refresh. Upgrade-pad: sql.js verplaatsen naar een Web Worker met `terminate()`-timeout (zie *Upgrade-paden* hieronder).

### Schaal & verwachte capaciteit

| Aantal gebruikers tegelijk | Setup | Kost | Werkt? |
|---|---|---|---|
| 1–100 vrienden | Vercel Hobby + huidige architectuur | **€0** | Ruimschoots |
| 1.000+ DAU | Vercel Hobby (bandwidth: 100 GB/mnd gratis) | **€0** | Ja, want statisch |
| 10.000+ DAU | Vercel Pro of Cloudflare Pages | €0–20/mnd | Ja, met CDN-caching |
| 100.000+ DAU | CDN + static hosting (R2/S3 + Cloudflare) | <€10/mnd | Trivial |

**Bottleneck zit niet bij de server**, want elke gebruiker rekent op zijn eigen toestel.

### SQLite vs PostgreSQL

| Vraag | Antwoord |
|---|---|
| Voor oefenen? | **SQLite (sql.js) — beter.** Geen server, geen connection-pool issues, oneindig schaalbaar. |
| Voor leaderboard / accounts? | **Postgres (Neon of Vercel Postgres).** Pas inschakelen wanneer je shared state nodig hebt. |
| Examen-syntax matchen (cursus = PG)? | 95% overlap. Voor `EXTRACT`, `ILIKE`, `AGE()`, … zie de [Postgres-compat notitie](#postgres-compatibiliteit). |

### Hosting beslismatrix

| Doel | Aanrader |
|---|---|
| **Snelste deploy, gratis, jouw situatie** | ⭐ **Vercel Hobby** + GitHub auto-deploy |
| Geen Vercel? | Netlify of Cloudflare Pages |
| Wil je een echte DB-backend? | Neon (gratis tier) of Supabase, gekoppeld aan Vercel API routes |
| Volledig zelf-gehost? | Docker + Caddy op een VPS (€5/mnd) |

---

## 🛡️ Security-checklist (voor als je server-side ooit aan zet)

De huidige app heeft géén server-state, dus onderstaande geldt enkel **als je later** leaderboard / shared exercises toevoegt:

1. **Sandbox de DB-rol** — `CREATE ROLE student WITH LOGIN PASSWORD '…' NOSUPERUSER;` + `GRANT SELECT ON ALL TABLES …`. Nooit een schrijvende rol vanuit user input.
2. **Aparte read-only DB** — schema apart van leaderboard-DB. Een `DROP TABLE` op de oefen-DB doet niets bij de leaderboard-DB.
3. **Statement timeout** — `SET statement_timeout = '3s';` per connectie. Voorkomt trage-query DoS.
4. **Parameterized queries** — voor server-eigen logica (leaderboard) altijd prepared statements. Voor *user-supplied SQL* (de playground): laat het lopen op een wegwerp-DB met timeouts.
5. **Allowlist parser (optioneel)** — gebruik `node-sql-parser` om enkel `SELECT`/`WITH` toe te laten en `INSERT/UPDATE/DELETE/DROP/ATTACH` te blokkeren.
6. **Rate limiting** — Vercel + `@upstash/ratelimit` (gratis tier) → 10 queries/min per IP.
7. **CORS strikt** — `/api/*` enkel vanaf eigen domein.
8. **Secrets in Vercel env vars** — nooit in repo. Voorbeeld: `DATABASE_URL`, `NEXTAUTH_SECRET`.
9. **Connection pooling** — voor Postgres in serverless: gebruik Neon's pooler-URL of `@vercel/postgres`, anders cold-start connection exhaustion.
10. **Cold starts minimaliseren** — Edge Runtime voor leesroutes (`export const runtime = 'edge';`), Node alleen waar Postgres echt nodig is.

---

## 📚 Wat zit erin (cursus-coverage)

| Hoofdstuk | Aantal oefeningen | Tags |
|---|---|---|
| H4.1-2 Basic SELECT | 6 | select, distinct, order-by, alias |
| H4.3 Datatypes & Operatoren | 7 | where, like, in, between, null, logical |
| H4.4 Joins | 7 | join, inner, left, m2n, anti-join |
| H4.5 Functies | 4 | string, numeric, coalesce, null |
| H4.6 Aggregatie | 6 | count, avg, group-by, having, max |
| H4.7 Verzamelingsoperatoren | 3 | union, intersect, except |
| H4.8 CASE | 2 | case |
| H4.9 Subqueries | 6 | subquery, exists, cte |
| Reeks 8 Views | 1 | view |
| **Algemene SQL (Classics)** | 18 | basics → CTE / self-join |

Oefeningen toevoegen: edit `data/exercises.zoekertje.json` of `data/exercises.classics.json` — geen rebuild van de DB nodig.

---

## 🧭 Upgrade-paden (later, indien nodig)

| Behoefte | Hoe |
|---|---|
| Trage queries bevriezen UI | Verplaats sql.js naar een Web Worker met `setTimeout` + `worker.terminate()` |
| Postgres-dialect i.p.v. SQLite | Vervang sql.js door [pglite](https://github.com/electric-sql/pglite) (Postgres-in-WASM) |
| Accounts | NextAuth + GitHub OAuth → `/api/auth/[...nextauth]` |
| Leaderboard | Neon free tier + Vercel Edge Functions, cached 60s |
| Eigen oefeningen delen | JSON-bestanden in `data/` + git PR — zero infra |
| AI-feedback ("waarom is mijn query fout?") | API-route die studentSQL + modelSQL + diff naar Claude/OpenAI stuurt |

### Postgres-compatibiliteit

De cursus gebruikt PostgreSQL-functies (`EXTRACT`, `AGE`, `ILIKE`, `STRING_AGG`). SQLite mist een paar daarvan, dus de oefeningen zijn in **SQLite-compatibel dialect** geschreven waar dat verschilt. Voor 100% PG-syntax: schakel `pglite` in (~3 MB extra WASM-blob, identieke API).

---

## ❓ FAQ

**Q: Vergeet hij mijn voortgang als ik mijn browser sluit?**
A: Nee — localStorage. Wel: incognito = wel weg.

**Q: Kan ik de DB resetten?**
A: Ja, in de Playground → ↺ Reset database (per mode).

**Q: Werkt het op mobiel?**
A: Ja, responsive. Monaco-editor is op kleine schermen wat krap — overweeg een laptop voor het echte oefenwerk.

**Q: Kosten?**
A: €0 op Vercel Hobby. Voor wat vrienden gebruik je 0,1% van de free-tier-limieten.

---

## 📄 Licentie

MIT — doe ermee wat je wil. Veel succes met je examen 🚀
