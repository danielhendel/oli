# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8025 | 2.3366 | 0.4995 | 1.4170 |
| perf | 51.0000 | 120000 | true | 0.3416 | 4.5205 | 0.1726 | 3.7563 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8051, H2=0.1592, H3=0.0357
- perf: P1=0.8785, P3=0.1215

No product bands, no clinical claims. Synthetic fallback parameters only.
