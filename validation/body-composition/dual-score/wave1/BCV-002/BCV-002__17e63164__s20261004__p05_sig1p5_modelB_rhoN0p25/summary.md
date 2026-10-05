# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5982 | 1.7413 | 0.5000 | 0.7870 |
| perf | 51.0000 | 120000 | true | 0.1486 | 2.2503 | 0.1171 | 1.2858 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8226, H2=0.1643, H3=0.0132
- perf: P1=0.8363, P3=0.1637

No product bands, no clinical claims. Synthetic fallback parameters only.
