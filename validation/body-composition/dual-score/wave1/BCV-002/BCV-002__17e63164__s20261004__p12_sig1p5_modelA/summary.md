# BCV-002 — Measurement perturbation

- persona: P-12 (female), sigma multiplier: 1.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 48.6833 | 170000 | true | 1.0692 | 3.0670 | 0.4989 | 2.4696 |
| perf | 45.1316 | 120000 | true | 1.6158 | 5.5538 | 0.4940 | 7.3891 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6468, H2=0.0437, H3=0.3096
- perf: P1=1.0577, P3=-0.0577

No product bands, no clinical claims. Synthetic fallback parameters only.
