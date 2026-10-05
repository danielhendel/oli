# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2349 | 0.6795 | 0.4999 | 0.1206 |
| perf | 52.6377 | 120000 | true | 0.4645 | 1.3509 | 0.5000 | 0.4718 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5347, H2=0.0135, H3=0.4518
- perf: P1=1.0124, P3=-0.0124

No product bands, no clinical claims. Synthetic fallback parameters only.
