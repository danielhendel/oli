# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 0.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.2451 | 0.7122 | 0.5001 | 0.1319 |
| perf | 52.6377 | 120000 | true | 0.4349 | 1.2604 | 0.4980 | 0.4146 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4873, H2=0.0540, H3=0.4588
- perf: P1=1.0788, P3=-0.0788

No product bands, no clinical claims. Synthetic fallback parameters only.
