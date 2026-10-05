# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5315 | 1.5472 | 0.5003 | 0.6202 |
| perf | 22.8750 | 120000 | true | 0.4699 | 3.9737 | 0.1799 | 1.8365 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7275, H2=0.0006, H3=0.2719
- perf: P1=1.1493, P3=-0.1493

No product bands, no clinical claims. Synthetic fallback parameters only.
