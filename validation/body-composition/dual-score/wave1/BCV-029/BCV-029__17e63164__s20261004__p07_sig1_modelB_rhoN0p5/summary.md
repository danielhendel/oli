# BCV-029 — Joint correlated measurement error propagation

- persona: P-07 (male), sigma multiplier: 1
- model: B (rho=-0.5)
- expected correlations: corr(FM,FFM)=-0.5, corr(FFM,ALM)=-0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.4680 | 1.3594 | 0.5015 | 0.4820 |
| perf | 52.6377 | 120000 | true | 0.9253 | 2.6776 | 0.5019 | 1.8746 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5337, H2=0.0120, H3=0.4543
- perf: P1=1.0109, P3=-0.0109

No product bands, no clinical claims. Synthetic fallback parameters only.
