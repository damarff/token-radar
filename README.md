# Token Radar

> Which pre-token protocol is worth farming next? A ranked board of 200 pre-token protocols from a sealed DefiLlama snapshot — 40 from the watchlist plus 160 early rows below the watchlist floor — each with an implied value and a farm plan you can actually follow.

[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-7c3aed)](https://make.fun/bounty/token-radar-01)
[![reward](https://img.shields.io/badge/reward-$1%2C325-16a34a)](https://make.fun/bounty/token-radar-01)
[![rank](https://img.shields.io/badge/rank-200%20rows-blue)](https://make.fun/bounty/token-radar-01)

## How it works

The program reads one sealed snapshot (`input/snapshot.json`), scores every pre-token protocol with the model in `lib/model.ts`, and writes a ranked board to `board.json` plus a static dashboard you can open in any browser.

The model follows only from the snapshot's own figures — no protocol name is ever special-cased:

```
base        = TVL × 0.25
growth      = clamp(7-day change, −60%, +150%)
growth mult = 1 + growth × 0.75 while capital flows in, × 0.9375 while it flows out
maturity    = 0.6 + min(age, 1,095 days) ÷ 1,095 × 0.4
implied     = base × growth multiplier × maturity multiplier
```

A falling TVL is weighted harder than a rising one, because farmers leave before a token that never comes. Each row also carries a `why` line and `risk_flags` from the same figures, and a 7-step farm plan derived from its category, chains, TVL and age.

## Run it

Node ≥ 22.18, standard library only — nothing to install:

```sh
node main.ts --input <snapshot.json> --out <out-dir>
```

The output dir holds `board.json`, `data.js`, `dashboard/` (open `dashboard/index.html` in a browser — no server, no network) and `screenshots/`, plus `dossier.json`, the summary the judge reads.

## License

MIT — see [LICENSE](LICENSE).

## Referral

Built for make.fun's ["Build the best token launch radar"](https://make.fun/bounty/token-radar-01) bounty ($1,325 in USDC). Referral code: `mkep9qym`.
