# active-session-app (TokenForge demo fixture)

Synthetic app used as the **extension → CLI session-signal fixture for #137**.
Not an npm workspace and not a product package.

Every other fixture asks whether a rule reads a *file* correctly. This one asks
something a file cannot answer: **is the developer working on this right now?**

## The case

`locales/en.json` is ~250 KB. On any given day it is exactly the kind of bulk
context TokenForge should keep out of an agent prompt — and on the day someone
is fixing a translation, it is the single most important file in the repo. Same
bytes, same name, same class, opposite correct answer.

`docs/HEURISTICS_AUDIT.md` records this as the one case left open by the
heuristic pass: a scan running once, offline, cannot know. Only the editor
knows, so the editor has to say.

## What's in here and why

| Path | ~Bytes | Without the signal | With the signal |
| --- | ---: | --- | --- |
| `locales/en.json` | 257 KB | `oversized` → **excluded** | `oversized` → **kept** |
| `package-lock.json` | 176 KB | `high_risk_filetype` → excluded | unchanged — control: never open, still excluded |
| `src/index.ts` | <1 KB | keep-set | unchanged |

The lockfile control matters as much as the locale file: the session signal
must protect what is open **without** blunting the tool on everything else.

## The session signal

`fixtures/expected/active-session-last-scan.json` is a Token Risk report shaped
exactly like the extension's `.tokenforge/last-scan.json`, listing
`locales/en.json` in `activePaths`. It lives outside the fixture on purpose —
inside, it would be scanned as part of the repo under test and change the very
totals it is meant to influence.

```bash
npm run tokenforge -- scan fixtures/active-session-app \
  --active-paths-file fixtures/expected/active-session-last-scan.json
```

## Expected scan result

The golden file pins the **baseline** — no signal, `locales/en.json` excluded —
because that is still the correct answer for the far more common case where
nobody has the file open. The delta is what
`cli/src/commands/apply/apply.active.test.ts` asserts: with the flag, the
finding survives as `kept`, its tokens stop counting as saved, and no exclusion
artifact names it.

## Layout

```text
fixtures/active-session-app/
├── locales/en.json     # large, legitimate, sometimes the whole task
├── package-lock.json   # control: real waste, never open
├── src/index.ts        # control: keep-set, imports the locale file
└── package.json
```
