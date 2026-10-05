# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2335 | 0.6784 | 0.4983 | 0.1203 |
| perf | 52.6377 | 120000 | true | 0.4075 | 1.1769 | 0.4986 | 0.3620 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5328, H2=0.0131, H3=0.4541
- perf: P1=1.1653, P3=-0.1653

No product bands, no clinical claims. Synthetic fallback parameters only.
