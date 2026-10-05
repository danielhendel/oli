# BCV-002 — Measurement perturbation

- persona: P-02 (male), sigma multiplier: 1.5
- model: B (rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 73.1000 | 120000 | true | 0.8072 | 2.3085 | 0.4756 | 1.3320 |
| perf | 88.8261 | 160000 | true | 1.4887 | 3.5890 | 0.4985 | 3.7343 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8618, H2=0.0000, H3=0.1382
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
