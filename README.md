# Farming Scenario & Decision Simulator

Compare farming decisions before committing resources. Runs completely offline;
uses the network only to make its numbers fresher.

![CI](https://github.com/OWNER/farm-simulator/actions/workflows/ci.yml/badge.svg)

## Why it is built this way

The simulation engine is a pure, synchronous, dependency-free module. It never
calls the network, so a plan can be built, compared and explained on a phone
with no signal. Rainfall forecasts and mandi prices are *enrichment*: when they
are unavailable, the model falls back to cached values and then to documented
defaults, and the interface labels every number with where it came from.

The same engine is imported by the browser and by the API server, so the offline
result and the server result are identical by construction rather than by luck.

## Layout

```
farm-simulator/
├── packages/engine/          ← the model. Pure TS, no I/O, unit tested.
│   └── src/
│       ├── types.ts          ← the contract every module codes against
│       ├── model.json        ← every constant, each with a cited source
│       ├── simulate.ts       ← FAO-33 water response, Mitscherlich nutrients,
│       │                       pest cover, sowing window, costs, risk
│       ├── risk.ts           ← seeded Monte Carlo → P10/P50/P90, P(loss)
│       ├── attribution.ts    ← one-at-a-time decomposition of a profit gap
│       ├── explain.ts        ← attribution numbers → sentences
│       └── simulate.test.ts
├── apps/api/                 ← Express + SQLite
│   └── src/
│       ├── db.ts             ← scenarios table + server-side response cache
│       └── routes/
│           ├── scenarios.ts  ← GET /api/scenarios, POST /api/scenarios/sync
│           ├── market.ts     ← weather + mandi price proxy, cached, keys hidden
│           └── simulate.ts   ← POST /api/simulate, /api/simulate/compare
└── apps/web/                 ← React + Vite PWA
    └── src/
        ├── platform/         ← IndexedDB, sync manager, enrichment fetcher
        ├── i18n/             ← 40-line translator + en/hi/mr locale files
        ├── ui/               ← parameter panel, status bar, language switch
        └── compare/          ← comparison table, attribution waterfall
```

## Languages

English, Hindi and Marathi, including the generated explanation sentences and
risk-driver names — the engine emits translation keys rather than text, so
nothing is stuck in English. Locale files are bundled, not fetched, so
switching language works offline. See `docs/I18N.md` to add another.

## Run it

```bash
npm install
npm run dev          # web on :5173, api on :8787
npm test
```

Optional, for live mandi prices: `AGMARKNET_KEY=...` in `apps/api/.env`
(free key from data.gov.in). Without it the app uses the MSP in `model.json`
and labels those figures as model defaults.

## Prove it works offline

1. `npm run build && npm run preview` in `apps/web`
2. Load the page once
3. DevTools → Network → Offline, then reload

Everything still renders. Saved plans queue in IndexedDB and push when the
network returns.

## Team

| Area | Owner |
|------|-------|
| `packages/engine` — model, risk | Member A |
| `apps/web/src/ui` + `src/i18n` — interaction, languages | Member B |
| `apps/web/src/compare` — comparison, explainability | Member C |
| `apps/web/src/platform` + `apps/api` — offline, sync, backend, CI | Member D |

See `docs/GIT_WORKFLOW.md` for the branching and review process, and
`DECISIONS.md` for the architectural calls and who made them.

## Known limits

The constants in `model.json` are indicative and must be replaced with verified
district figures before they are used for any real decision. The model treats
the season as a single period and does not simulate growth stages, soil type,
or variety. These are stated rather than hidden because a simulator that
overstates its own precision is worse than one that does not.
