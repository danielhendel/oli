# BCV-002 — Measurement perturbation

- persona: P-08 (male), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 1.0396 | 3.0206 | 0.4944 | 2.3422 |
| perf | 22.8750 | 130000 | true | 0.9721 | 8.9629 | 0.3847 | 10.2628 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7817, H2=0.0277, H3=0.1907
- perf: P1=0.9681, P3=0.0319

No product bands, no clinical claims. Synthetic fallback parameters only.
