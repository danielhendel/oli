# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5771 | 1.6690 | 0.5008 | 0.7251 |
| perf | 22.8750 | 120000 | true | 0.4815 | 4.2177 | 0.3106 | 2.1945 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6169, H2=0.0757, H3=0.3074
- perf: P1=1.0437, P3=-0.0437

No product bands, no clinical claims. Synthetic fallback parameters only.
