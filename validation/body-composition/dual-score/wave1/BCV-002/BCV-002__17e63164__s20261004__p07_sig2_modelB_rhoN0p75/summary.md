# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.8872 | 2.5643 | 0.4982 | 1.7140 |
| perf | 52.6377 | 190000 | true | 1.9102 | 5.5354 | 0.4997 | 7.9916 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6071, H2=-0.0487, H3=0.4417
- perf: P1=0.9836, P3=0.0164

No product bands, no clinical claims. Synthetic fallback parameters only.
