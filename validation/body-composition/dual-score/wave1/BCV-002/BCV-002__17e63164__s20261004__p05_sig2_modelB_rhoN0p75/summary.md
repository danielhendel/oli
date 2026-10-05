# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8164 | 2.3954 | 0.4997 | 1.4876 |
| perf | 51.0000 | 150000 | true | 0.1774 | 4.0621 | 0.1428 | 3.0578 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7718, H2=0.1731, H3=0.0551
- perf: P1=0.9646, P3=0.0354

No product bands, no clinical claims. Synthetic fallback parameters only.
