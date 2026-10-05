# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 1
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4680 | 1.3602 | 0.4998 | 0.4817 |
| perf | 52.6377 | 120000 | true | 0.9229 | 2.6926 | 0.4997 | 1.8812 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5318, H2=0.0137, H3=0.4545
- perf: P1=1.0120, P3=-0.0120

No product bands, no clinical claims. Synthetic fallback parameters only.
