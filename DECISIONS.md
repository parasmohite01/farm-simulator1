# Decisions

One line per architectural call: what, why, who, when. Five minutes to write,
and it is the artifact that shows four people actually deliberated.

| # | Decision | Reason | Decided by | Date |
|---|----------|--------|-----------|------|
| 1 | IndexedDB is the source of truth; the server is a replica | The app must be fully usable with no network, so the client cannot wait on the server for anything | all four | |
| 2 | One shared `@farm/engine` package imported by both web and api | Guarantees the offline result and the server result are identical, which we can demonstrate live | A, D | |
| 3 | Replaced the hand-written service worker with vite-plugin-pwa | The manual asset list never included hashed bundle filenames, so cold offline start failed | D | |
| 4 | Risk reported as a profit distribution, not a single score | "18% chance of loss" is a decision a farmer can act on; "risk: 43" is not | A, C | |
| 5 | Explanations are templated from attribution output, not generated text | The words can never drift from the numbers | C | |
| 6 | Last-write-wins sync on `lastModified` | Single-farmer data, no concurrent editing; a simple rule we can defend beats a clever one we cannot | D | |
