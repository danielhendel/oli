# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.7232 | 2.0985 | 0.5001 | 1.1500 |
| perf | 52.6377 | 150000 | true | 1.3472 | 3.9109 | 0.5011 | 4.0095 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4964, H2=0.0450, H3=0.4586
- perf: P1=1.0434, P3=-0.0434

No product bands, no clinical claims. Synthetic fallback parameters only.
