# BCV-030 — Aggregate uncertainty propagation

- persona: P-06 (male), sigma multiplier: 1.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.3814 | 120000 | true | 0.9090 | 2.6467 | 0.4990 | 1.8160 |
| perf | 85.5652 | 120000 | true | 1.4540 | 4.2253 | 0.4993 | 4.6143 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7016, H2=0.0000, H3=0.2984
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
