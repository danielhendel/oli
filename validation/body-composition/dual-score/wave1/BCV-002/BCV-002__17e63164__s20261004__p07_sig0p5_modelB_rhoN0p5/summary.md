# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 0.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2342 | 0.6820 | 0.5000 | 0.1213 |
| perf | 52.6377 | 120000 | true | 0.4635 | 1.3473 | 0.4975 | 0.4735 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5349, H2=0.0142, H3=0.4509
- perf: P1=1.0120, P3=-0.0120

No product bands, no clinical claims. Synthetic fallback parameters only.
