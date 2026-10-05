# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2329 | 0.6803 | 0.5016 | 0.1207 |
| perf | 52.6377 | 120000 | true | 0.4630 | 1.3432 | 0.5018 | 0.4711 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5328, H2=0.0132, H3=0.4540
- perf: P1=1.0107, P3=-0.0107

No product bands, no clinical claims. Synthetic fallback parameters only.
