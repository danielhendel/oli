# BCV-002 — Measurement perturbation

- persona: P-10 (male), sigma multiplier: 0.5
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 76.0742 | 120000 | true | 0.3033 | 0.8811 | 0.4998 | 0.2020 |
| perf | 80.1304 | 330000 | true | 0.4721 | 1.3676 | 0.4983 | 0.4885 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6878, H2=0.0000, H3=0.3122
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
