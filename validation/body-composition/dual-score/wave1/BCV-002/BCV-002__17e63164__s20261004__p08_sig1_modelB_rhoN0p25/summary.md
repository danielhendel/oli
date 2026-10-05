# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5712 | 1.6557 | 0.4997 | 0.7144 |
| perf | 22.8750 | 120000 | true | 0.4785 | 4.3300 | 0.3392 | 2.3168 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6283, H2=0.0680, H3=0.3037
- perf: P1=1.0163, P3=-0.0163

No product bands, no clinical claims. Synthetic fallback parameters only.
