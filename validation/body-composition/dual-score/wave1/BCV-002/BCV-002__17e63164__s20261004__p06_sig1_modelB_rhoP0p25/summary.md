# BCV-002 — Measurement perturbation

- persona: P-06 (male), sigma multiplier: 1
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.3814 | 120000 | true | 0.6112 | 1.7852 | 0.5000 | 0.8261 |
| perf | 85.5652 | 120000 | true | 0.9763 | 2.8237 | 0.4997 | 2.0841 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6856, H2=0.0000, H3=0.3144
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
