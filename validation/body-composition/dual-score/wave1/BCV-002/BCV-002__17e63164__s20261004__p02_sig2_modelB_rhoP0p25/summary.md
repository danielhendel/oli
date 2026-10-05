# BCV-002 — Measurement perturbation

- persona: P-02 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 73.1000 | 120000 | true | 1.0764 | 3.0777 | 0.4760 | 2.3682 |
| perf | 88.8261 | 200000 | true | 1.9686 | 4.7715 | 0.4988 | 5.8588 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8626, H2=0.0001, H3=0.1372
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
