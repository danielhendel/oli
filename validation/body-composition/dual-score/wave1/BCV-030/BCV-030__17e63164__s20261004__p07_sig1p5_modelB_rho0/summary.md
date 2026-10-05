# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.7336 | 2.1330 | 0.4991 | 1.1847 |
| perf | 52.6377 | 120000 | true | 1.3105 | 3.7988 | 0.5014 | 3.7699 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4873, H2=0.0546, H3=0.4581
- perf: P1=1.0764, P3=-0.0764

No product bands, no clinical claims. Synthetic fallback parameters only.
