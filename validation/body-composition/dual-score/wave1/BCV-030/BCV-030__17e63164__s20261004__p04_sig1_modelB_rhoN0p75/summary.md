# BCV-030 — Aggregate uncertainty propagation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5503 | 1.5025 | 0.4989 | 0.6169 |
| perf | 70.0000 | 170000 | true | 0.2927 | 1.1965 | 0.5005 | 0.2761 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8868, H2=0.1132, H3=0.0000
- perf: P1=-0.0003, P3=1.0003

No product bands, no clinical claims. Synthetic fallback parameters only.
