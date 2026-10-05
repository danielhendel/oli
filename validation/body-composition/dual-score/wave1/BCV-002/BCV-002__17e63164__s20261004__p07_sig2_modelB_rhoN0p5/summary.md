# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9313 | 2.7023 | 0.5002 | 1.9074 |
| perf | 52.6377 | 160000 | true | 1.8535 | 5.3936 | 0.4970 | 7.5615 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5359, H2=0.0141, H3=0.4499
- perf: P1=1.0109, P3=-0.0109

No product bands, no clinical claims. Synthetic fallback parameters only.
