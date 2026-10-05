# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4912 | 1.4273 | 0.5000 | 0.5296 |
| perf | 52.6377 | 120000 | true | 0.8732 | 2.5145 | 0.4979 | 1.6584 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4862, H2=0.0547, H3=0.4591
- perf: P1=1.0775, P3=-0.0775

No product bands, no clinical claims. Synthetic fallback parameters only.
