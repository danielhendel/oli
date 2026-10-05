# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 1.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.7323 | 2.1281 | 0.5000 | 1.1834 |
| perf | 52.6377 | 120000 | true | 1.3061 | 3.7869 | 0.4979 | 3.7450 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4851, H2=0.0550, H3=0.4599
- perf: P1=1.0775, P3=-0.0775

No product bands, no clinical claims. Synthetic fallback parameters only.
