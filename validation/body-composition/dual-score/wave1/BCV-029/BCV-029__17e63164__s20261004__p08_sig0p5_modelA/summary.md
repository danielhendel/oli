# BCV-029 — Joint correlated measurement error propagation

- persona: P-08 (male), sigma multiplier: 0.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2930 | 0.8592 | 0.5014 | 0.1907 |
| perf | 22.8750 | 120000 | true | 0.2405 | 2.1050 | 0.3134 | 0.5437 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5820, H2=0.0663, H3=0.3516
- perf: P1=1.0451, P3=-0.0451

No product bands, no clinical claims. Synthetic fallback parameters only.
