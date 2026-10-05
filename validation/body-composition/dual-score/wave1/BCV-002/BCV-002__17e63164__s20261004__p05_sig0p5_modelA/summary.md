# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 0.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.1987 | 0.5754 | 0.4996 | 0.0860 |
| perf | 51.0000 | 120000 | true | 0.0000 | 0.4351 | 0.0008 | 0.0240 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8387, H2=0.1613, H3=0.0000
- perf: P1=0.0100, P3=0.9900

No product bands, no clinical claims. Synthetic fallback parameters only.
