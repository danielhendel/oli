# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.7267 | 2.1024 | 0.4977 | 1.1573 |
| perf | 52.6377 | 120000 | true | 1.2642 | 3.6776 | 0.4994 | 3.5314 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4952, H2=0.0438, H3=0.4611
- perf: P1=1.1194, P3=-0.1194

No product bands, no clinical claims. Synthetic fallback parameters only.
