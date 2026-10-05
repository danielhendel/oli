# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9665 | 2.8025 | 0.4977 | 2.0542 |
| perf | 52.6377 | 130000 | true | 1.6804 | 4.8805 | 0.4995 | 6.2083 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5007, H2=0.0472, H3=0.4521
- perf: P1=1.1191, P3=-0.1191

No product bands, no clinical claims. Synthetic fallback parameters only.
