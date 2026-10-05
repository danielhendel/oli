# BCV-002 — Measurement perturbation

- persona: P-03 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 77.8000 | 120000 | true | 0.9557 | 2.7203 | 0.4986 | 1.9412 |
| perf | 55.2857 | 150000 | true | 3.4154 | 8.4760 | 0.4981 | 17.7060 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4811, H2=0.0000, H3=0.5189
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
