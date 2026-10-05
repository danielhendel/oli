# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 1
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3925 | 1.1434 | 0.5000 | 0.3397 |
| perf | 51.0000 | 120000 | true | 0.0657 | 1.0408 | 0.0556 | 0.2614 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8372, H2=0.1615, H3=0.0014
- perf: P1=0.5851, P3=0.4149

No product bands, no clinical claims. Synthetic fallback parameters only.
