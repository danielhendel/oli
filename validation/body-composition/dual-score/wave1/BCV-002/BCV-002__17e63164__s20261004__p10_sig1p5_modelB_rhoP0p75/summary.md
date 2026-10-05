# BCV-002 — Measurement perturbation

- persona: P-10 (male), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 76.0742 | 120000 | true | 0.9063 | 2.6284 | 0.4997 | 1.8089 |
| perf | 80.1304 | 290000 | true | 1.4113 | 4.1007 | 0.5011 | 4.3688 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6920, H2=-0.0008, H3=0.3088
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
