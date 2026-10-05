# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9690 | 2.8016 | 0.5001 | 2.0509 |
| perf | 52.6377 | 150000 | true | 1.6866 | 4.9002 | 0.4979 | 6.2234 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5027, H2=0.0445, H3=0.4528
- perf: P1=1.1195, P3=-0.1195

No product bands, no clinical claims. Synthetic fallback parameters only.
