# BCV-002 — Measurement perturbation

- persona: P-11 (female), sigma multiplier: 0.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 93.4182 | 120000 | true | 0.1880 | 0.5495 | 0.4998 | 0.0783 |
| perf | 87.0526 | 120000 | true | 0.5978 | 1.7324 | 0.4980 | 0.7836 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=1.0000, H2=0.0000, H3=0.0000
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
