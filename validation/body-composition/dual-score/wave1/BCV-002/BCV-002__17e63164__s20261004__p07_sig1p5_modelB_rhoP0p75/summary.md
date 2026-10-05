# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.6621 | 1.9159 | 0.4990 | 0.9588 |
| perf | 52.6377 | 120000 | true | 1.1677 | 3.4079 | 0.4988 | 3.0153 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6025, H2=-0.0524, H3=0.4498
- perf: P1=1.2198, P3=-0.2198

No product bands, no clinical claims. Synthetic fallback parameters only.
