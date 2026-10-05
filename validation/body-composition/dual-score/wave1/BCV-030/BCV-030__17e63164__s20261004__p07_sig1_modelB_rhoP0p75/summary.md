# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 1
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4409 | 1.2766 | 0.4980 | 0.4255 |
| perf | 52.6377 | 120000 | true | 0.7822 | 2.2683 | 0.5006 | 1.3427 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6055, H2=-0.0489, H3=0.4434
- perf: P1=1.2195, P3=-0.2195

No product bands, no clinical claims. Synthetic fallback parameters only.
