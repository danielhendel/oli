# BCV-030 — Aggregate uncertainty propagation

- persona: P-09 (male), sigma multiplier: 1.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 0.8890 | 2.5682 | 0.4969 | 1.7218 |
| perf | 89.5833 | 230000 | true | 0.6618 | 1.9238 | 0.4999 | 0.9620 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7943, H2=0.2057, H3=0.0000
- perf: P1=0.0000, P3=1.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
