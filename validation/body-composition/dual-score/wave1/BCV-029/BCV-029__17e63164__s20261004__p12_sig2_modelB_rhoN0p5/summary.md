# BCV-029 — Joint correlated measurement error propagation

- persona: P-12 (female), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 160000 | true | 1.3759 | 3.9704 | 0.5014 | 4.1149 |
| perf | 45.1316 | 120000 | true | 2.4227 | 8.5022 | 0.4975 | 17.2451 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6734, H2=0.0218, H3=0.3048
- perf: P1=0.9812, P3=0.0188

No product bands, no clinical claims. Synthetic fallback parameters only.
