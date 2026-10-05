# BCV-002 — Measurement perturbation

- persona: P-07 (male), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.7033 | 2.0393 | 0.4981 | 1.0831 |
| perf | 52.6377 | 120000 | true | 1.2135 | 3.5424 | 0.4980 | 3.2586 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.5319, H2=0.0138, H3=0.4543
- perf: P1=1.1649, P3=-0.1649

No product bands, no clinical claims. Synthetic fallback parameters only.
