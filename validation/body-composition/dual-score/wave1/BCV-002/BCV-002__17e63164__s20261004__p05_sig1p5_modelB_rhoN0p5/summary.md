# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5971 | 1.7409 | 0.5001 | 0.7863 |
| perf | 51.0000 | 120000 | true | 0.1139 | 2.1785 | 0.1114 | 1.2026 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8192, H2=0.1647, H3=0.0161
- perf: P1=0.8655, P3=0.1345

No product bands, no clinical claims. Synthetic fallback parameters only.
