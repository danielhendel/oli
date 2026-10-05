# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.1156 | 3.2572 | 0.4960 | 2.7192 |
| perf | 22.8750 | 130000 | true | 0.9507 | 8.4769 | 0.3118 | 8.7875 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6793, H2=0.0922, H3=0.2286
- perf: P1=1.0448, P3=-0.0448

No product bands, no clinical claims. Synthetic fallback parameters only.
