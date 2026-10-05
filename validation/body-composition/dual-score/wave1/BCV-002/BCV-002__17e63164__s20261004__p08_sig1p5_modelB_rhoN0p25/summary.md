# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.8326 | 2.4288 | 0.4973 | 1.5237 |
| perf | 22.8750 | 120000 | true | 0.7175 | 6.4541 | 0.3392 | 5.2191 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6637, H2=0.0790, H3=0.2572
- perf: P1=1.0163, P3=-0.0163

No product bands, no clinical claims. Synthetic fallback parameters only.
