# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4933 | 1.4267 | 0.4991 | 0.5312 |
| perf | 52.6377 | 120000 | true | 0.8734 | 2.5309 | 0.5014 | 1.6688 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4859, H2=0.0543, H3=0.4598
- perf: P1=1.0787, P3=-0.0787

No product bands, no clinical claims. Synthetic fallback parameters only.
