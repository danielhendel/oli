# BCV-030 — Aggregate uncertainty propagation

- persona: P-08 (male), sigma multiplier: 1
- model: B (rho=-0.25)
- expected correlations: corr(FM,FFM)=-0.25, corr(FFM,ALM)=-0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 34.8271 | 120000 | true | 0.5715 | 1.6551 | 0.4992 | 0.7137 |
| perf | 22.8750 | 120000 | true | 0.4783 | 4.3122 | 0.3387 | 2.3262 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.6281, H2=0.0687, H3=0.3032
- perf: P1=1.0173, P3=-0.0173

No product bands, no clinical claims. Synthetic fallback parameters only.
