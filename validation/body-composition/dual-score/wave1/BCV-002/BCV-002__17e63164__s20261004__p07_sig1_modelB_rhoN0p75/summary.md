# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 1
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4434 | 1.2866 | 0.4980 | 0.4288 |
| perf | 52.6377 | 120000 | true | 0.9526 | 2.7736 | 0.4990 | 2.0041 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6026, H2=-0.0513, H3=0.4486
- perf: P1=0.9831, P3=0.0169

No product bands, no clinical claims. Synthetic fallback parameters only.
