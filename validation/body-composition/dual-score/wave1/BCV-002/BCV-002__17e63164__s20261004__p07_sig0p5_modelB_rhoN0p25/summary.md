# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2412 | 0.7041 | 0.4993 | 0.1288 |
| perf | 52.6377 | 120000 | true | 0.4505 | 1.3067 | 0.4973 | 0.4443 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4970, H2=0.0454, H3=0.4576
- perf: P1=1.0424, P3=-0.0424

No product bands, no clinical claims. Synthetic fallback parameters only.
