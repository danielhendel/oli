# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.8869 | 2.5628 | 0.4990 | 1.7086 |
| perf | 52.6377 | 150000 | true | 1.5709 | 4.5477 | 0.4992 | 5.3577 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6072, H2=-0.0481, H3=0.4409
- perf: P1=1.2190, P3=-0.2190

No product bands, no clinical claims. Synthetic fallback parameters only.
