# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.6621 | 1.9191 | 0.4975 | 0.9586 |
| perf | 52.6377 | 170000 | true | 1.4302 | 4.1593 | 0.4997 | 4.5108 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6033, H2=-0.0492, H3=0.4459
- perf: P1=0.9833, P3=0.0167

No product bands, no clinical claims. Synthetic fallback parameters only.
