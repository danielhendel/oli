# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 1
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4883 | 1.4238 | 0.5020 | 0.5276 |
| perf | 52.6377 | 120000 | true | 0.8721 | 2.5355 | 0.5026 | 1.6677 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4845, H2=0.0547, H3=0.4608
- perf: P1=1.0788, P3=-0.0788

No product bands, no clinical claims. Synthetic fallback parameters only.
