# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9732 | 2.8167 | 0.5002 | 2.0642 |
| perf | 52.6377 | 170000 | true | 1.8024 | 5.2203 | 0.5009 | 7.0884 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5010, H2=0.0448, H3=0.4542
- perf: P1=1.0419, P3=-0.0419

No product bands, no clinical claims. Synthetic fallback parameters only.
