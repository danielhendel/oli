# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 0.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.2709 | 0.7890 | 0.4980 | 0.1618 |
| perf | 22.8750 | 120000 | true | 0.2345 | 1.9995 | 0.1773 | 0.4598 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6894, H2=-0.0135, H3=0.3241
- perf: P1=1.1490, P3=-0.1490

No product bands, no clinical claims. Synthetic fallback parameters only.
