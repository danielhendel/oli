# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8008 | 2.3375 | 0.4995 | 1.4152 |
| perf | 51.0000 | 130000 | true | 0.3486 | 4.4271 | 0.1722 | 3.7116 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8080, H2=0.1571, H3=0.0350
- perf: P1=0.8744, P3=0.1256

No product bands, no clinical claims. Synthetic fallback parameters only.
