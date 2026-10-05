# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 1.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.8163 | 2.3894 | 0.4974 | 1.4669 |
| perf | 22.8750 | 120000 | true | 0.7239 | 6.5540 | 0.3636 | 5.4866 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6944, H2=0.0574, H3=0.2482
- perf: P1=0.9930, P3=0.0070

No product bands, no clinical claims. Synthetic fallback parameters only.
