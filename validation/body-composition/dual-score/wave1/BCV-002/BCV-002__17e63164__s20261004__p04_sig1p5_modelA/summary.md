# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 1.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.8072 | 2.1960 | 0.5008 | 1.3052 |
| perf | 70.0000 | 320000 | true | 0.4389 | 1.7586 | 0.5007 | 0.6038 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8816, H2=0.1184, H3=0.0000
- perf: P1=-0.0123, P3=1.0123

No product bands, no clinical claims. Synthetic fallback parameters only.
