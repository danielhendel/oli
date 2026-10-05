# BCV-002 — Measurement perturbation

- persona: P-06 (male), sigma multiplier: 1
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.3814 | 120000 | true | 0.6153 | 1.7817 | 0.4995 | 0.8285 |
| perf | 85.5652 | 120000 | true | 0.9693 | 2.8187 | 0.4993 | 2.0681 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6843, H2=0.0000, H3=0.3157
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
