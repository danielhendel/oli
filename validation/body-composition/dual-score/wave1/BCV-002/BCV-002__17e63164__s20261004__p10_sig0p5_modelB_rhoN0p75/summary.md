# BCV-002 — Measurement perturbation

- persona: P-10 (male), sigma multiplier: 0.5
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 76.0742 | 120000 | true | 0.3048 | 0.8820 | 0.5001 | 0.2025 |
| perf | 80.1304 | 150000 | true | 0.4704 | 1.3649 | 0.4987 | 0.4863 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6874, H2=0.0000, H3=0.3126
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
