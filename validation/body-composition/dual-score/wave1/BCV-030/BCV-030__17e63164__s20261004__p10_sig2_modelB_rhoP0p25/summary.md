# BCV-030 — Aggregate uncertainty propagation

- persona: P-10 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 76.0742 | 120000 | true | 1.2123 | 3.5142 | 0.4985 | 3.2167 |
| perf | 80.1304 | 130000 | true | 1.8828 | 5.4712 | 0.4997 | 7.7870 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6929, H2=0.0008, H3=0.3063
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
