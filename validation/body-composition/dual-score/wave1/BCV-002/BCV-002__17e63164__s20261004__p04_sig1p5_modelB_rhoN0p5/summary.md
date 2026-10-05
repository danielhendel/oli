# BCV-002 — Measurement perturbation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 130000 | true | 0.8118 | 2.2062 | 0.5003 | 1.3165 |
| perf | 70.0000 | 230000 | true | 0.4376 | 1.7701 | 0.4995 | 0.6113 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8802, H2=0.1198, H3=-0.0000
- perf: P1=-0.0041, P3=1.0041

No product bands, no clinical claims. Synthetic fallback parameters only.
