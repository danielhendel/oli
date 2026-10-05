# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 1
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.5520 | 1.5036 | 0.5008 | 0.6175 |
| perf | 70.0000 | 130000 | true | 0.2937 | 1.1957 | 0.5000 | 0.2757 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8869, H2=0.1131, H3=0.0000
- perf: P1=-0.0019, P3=1.0019

No product bands, no clinical claims. Synthetic fallback parameters only.
