# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.7313 | 2.1219 | 0.5017 | 1.1738 |
| perf | 52.6377 | 140000 | true | 1.3029 | 3.8072 | 0.5025 | 3.7489 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4854, H2=0.0521, H3=0.4625
- perf: P1=1.0766, P3=-0.0766

No product bands, no clinical claims. Synthetic fallback parameters only.
