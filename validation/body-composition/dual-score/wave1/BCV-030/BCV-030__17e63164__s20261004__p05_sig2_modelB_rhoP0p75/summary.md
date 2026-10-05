# BCV-030 — Aggregate uncertainty propagation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8074 | 2.3924 | 0.4989 | 1.4805 |
| perf | 51.0000 | 160000 | true | 0.4860 | 4.7056 | 0.2001 | 4.0731 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7717, H2=0.1733, H3=0.0551
- perf: P1=0.8434, P3=0.1566

No product bands, no clinical claims. Synthetic fallback parameters only.
