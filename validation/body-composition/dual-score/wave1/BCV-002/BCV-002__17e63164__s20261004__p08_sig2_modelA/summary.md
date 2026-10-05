# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.1104 | 3.2554 | 0.4960 | 2.7152 |
| perf | 22.8750 | 120000 | true | 0.9606 | 8.5225 | 0.3106 | 8.8544 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6793, H2=0.0904, H3=0.2303
- perf: P1=1.0450, P3=-0.0450

No product bands, no clinical claims. Synthetic fallback parameters only.
