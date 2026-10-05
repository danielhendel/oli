# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5958 | 1.7294 | 0.5004 | 0.7779 |
| perf | 51.0000 | 120000 | true | 0.1761 | 2.3688 | 0.1230 | 1.3872 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8255, H2=0.1631, H3=0.0113
- perf: P1=0.8217, P3=0.1783

No product bands, no clinical claims. Synthetic fallback parameters only.
