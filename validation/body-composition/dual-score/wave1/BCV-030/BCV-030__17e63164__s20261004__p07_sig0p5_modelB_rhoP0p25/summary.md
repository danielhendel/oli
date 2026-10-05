# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2424 | 0.7043 | 0.4979 | 0.1291 |
| perf | 52.6377 | 120000 | true | 0.4199 | 1.2235 | 0.4992 | 0.3878 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4967, H2=0.0447, H3=0.4586
- perf: P1=1.1191, P3=-0.1191

No product bands, no clinical claims. Synthetic fallback parameters only.
