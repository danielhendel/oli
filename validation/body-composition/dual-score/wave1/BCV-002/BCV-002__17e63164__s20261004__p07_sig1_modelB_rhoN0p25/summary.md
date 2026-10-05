# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 1
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4838 | 1.4045 | 0.4991 | 0.5137 |
| perf | 52.6377 | 120000 | true | 0.8954 | 2.6113 | 0.4974 | 1.7696 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4986, H2=0.0459, H3=0.4554
- perf: P1=1.0422, P3=-0.0422

No product bands, no clinical claims. Synthetic fallback parameters only.
