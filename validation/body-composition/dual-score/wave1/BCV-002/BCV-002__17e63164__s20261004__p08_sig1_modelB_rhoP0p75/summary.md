# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5313 | 1.5438 | 0.4989 | 0.6182 |
| perf | 22.8750 | 120000 | true | 0.4709 | 4.0043 | 0.1778 | 1.8486 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7250, H2=0.0014, H3=0.2735
- perf: P1=1.1503, P3=-0.1503

No product bands, no clinical claims. Synthetic fallback parameters only.
