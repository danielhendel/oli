# BCV-002 — Measurement perturbation

- persona: P-03 (male), sigma multiplier: 1
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 77.8000 | 120000 | true | 0.4867 | 1.4199 | 0.4987 | 0.5214 |
| perf | 55.2857 | 120000 | true | 1.7232 | 4.2857 | 0.4986 | 6.0107 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4453, H2=0.0000, H3=0.5547
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
