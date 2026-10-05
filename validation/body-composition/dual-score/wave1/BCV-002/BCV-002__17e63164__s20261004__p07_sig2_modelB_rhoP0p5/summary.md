# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9340 | 2.7235 | 0.4981 | 1.9214 |
| perf | 52.6377 | 120000 | true | 1.6281 | 4.7147 | 0.4980 | 5.7676 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5344, H2=0.0149, H3=0.4507
- perf: P1=1.1653, P3=-0.1653

No product bands, no clinical claims. Synthetic fallback parameters only.
