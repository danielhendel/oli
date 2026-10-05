# BCV-030 — Aggregate uncertainty propagation

- persona: P-01 (male), sigma multiplier: 1.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 92.1618 | 120000 | true | 0.5251 | 1.5267 | 0.4992 | 0.6056 |
| perf | 91.0000 | 170000 | true | 0.4619 | 3.5297 | 0.4997 | 1.8308 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.9910, H2=0.0000, H3=0.0090
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
