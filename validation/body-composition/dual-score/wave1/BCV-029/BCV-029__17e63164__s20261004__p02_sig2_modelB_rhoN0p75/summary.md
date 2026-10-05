# BCV-029 — Joint correlated measurement error propagation

- persona: P-02 (male), sigma multiplier: 2
- model: B (rho=-0.75)
- expected correlations: corr(FM,FFM)=-0.75, corr(FFM,ALM)=-0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 73.1000 | 120000 | true | 1.0754 | 3.0860 | 0.4805 | 2.3631 |
| perf | 88.8261 | 170000 | true | 1.9785 | 4.7610 | 0.5010 | 5.8611 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8642, H2=0.0001, H3=0.1357
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
