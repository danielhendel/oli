# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 1
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4674 | 1.3597 | 0.5002 | 0.4807 |
| perf | 52.6377 | 120000 | true | 0.9247 | 2.6947 | 0.4977 | 1.8911 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5321, H2=0.0134, H3=0.4545
- perf: P1=1.0108, P3=-0.0108

No product bands, no clinical claims. Synthetic fallback parameters only.
