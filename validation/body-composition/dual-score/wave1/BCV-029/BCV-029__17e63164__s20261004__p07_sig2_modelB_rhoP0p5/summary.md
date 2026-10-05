# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9372 | 2.7209 | 0.5005 | 1.9256 |
| perf | 52.6377 | 120000 | true | 1.6203 | 4.7189 | 0.5007 | 5.7932 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5371, H2=0.0141, H3=0.4488
- perf: P1=1.1652, P3=-0.1652

No product bands, no clinical claims. Synthetic fallback parameters only.
