# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 130000 | true | 1.0519 | 2.9015 | 0.5003 | 2.2476 |
| perf | 70.0000 | 150000 | true | 0.5844 | 2.2184 | 0.4999 | 0.9858 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8786, H2=0.1214, H3=-0.0001
- perf: P1=-0.0504, P3=1.0504

No product bands, no clinical claims. Synthetic fallback parameters only.
