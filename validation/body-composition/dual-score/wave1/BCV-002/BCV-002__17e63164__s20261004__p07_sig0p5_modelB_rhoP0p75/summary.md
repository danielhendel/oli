# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2210 | 0.6382 | 0.4992 | 0.1065 |
| perf | 52.6377 | 120000 | true | 0.3910 | 1.1343 | 0.4988 | 0.3343 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6029, H2=-0.0520, H3=0.4492
- perf: P1=1.2196, P3=-0.2196

No product bands, no clinical claims. Synthetic fallback parameters only.
