# BCV-002 — Measurement perturbation

- persona: P-02 (male), sigma multiplier: 1
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 73.1000 | 120000 | true | 0.5373 | 1.5398 | 0.4766 | 0.5907 |
| perf | 88.8261 | 180000 | true | 0.9900 | 2.4459 | 0.4992 | 1.9215 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8612, H2=0.0000, H3=0.1388
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
