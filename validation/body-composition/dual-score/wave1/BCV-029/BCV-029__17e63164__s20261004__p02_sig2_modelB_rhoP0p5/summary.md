# BCV-029 — Joint correlated measurement error propagation

- persona: P-02 (male), sigma multiplier: 2
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 73.1000 | 120000 | true | 1.0847 | 3.0837 | 0.4778 | 2.3784 |
| perf | 88.8261 | 270000 | true | 1.9830 | 4.7490 | 0.5002 | 5.8663 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8635, H2=0.0001, H3=0.1364
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
