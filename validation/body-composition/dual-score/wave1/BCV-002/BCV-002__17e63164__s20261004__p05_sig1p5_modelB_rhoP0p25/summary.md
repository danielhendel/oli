# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5915 | 1.7314 | 0.5004 | 0.7761 |
| perf | 51.0000 | 120000 | true | 0.2074 | 2.4063 | 0.1288 | 1.4224 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8236, H2=0.1619, H3=0.0145
- perf: P1=0.8063, P3=0.1937

No product bands, no clinical claims. Synthetic fallback parameters only.
