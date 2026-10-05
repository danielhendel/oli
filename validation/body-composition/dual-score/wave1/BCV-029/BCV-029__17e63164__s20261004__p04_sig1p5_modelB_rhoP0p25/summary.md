# BCV-029 — Joint correlated measurement error propagation

- persona: P-04 (male), sigma multiplier: 1.5
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 68.8249 | 120000 | true | 0.8103 | 2.2101 | 0.4995 | 1.3200 |
| perf | 70.0000 | 290000 | true | 0.4353 | 1.7497 | 0.5002 | 0.5961 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8818, H2=0.1182, H3=0.0000
- perf: P1=-0.0171, P3=1.0171

No product bands, no clinical claims. Synthetic fallback parameters only.
