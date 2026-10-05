# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2208 | 0.6399 | 0.4976 | 0.1069 |
| perf | 52.6377 | 120000 | true | 0.4778 | 1.3879 | 0.5001 | 0.5006 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6028, H2=-0.0520, H3=0.4492
- perf: P1=0.9827, P3=0.0173

No product bands, no clinical claims. Synthetic fallback parameters only.
