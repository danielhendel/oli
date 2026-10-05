# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 1
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.3970 | 1.1533 | 0.4999 | 0.3456 |
| perf | 51.0000 | 120000 | true | 0.0467 | 1.0236 | 0.0510 | 0.2459 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8366, H2=0.1626, H3=0.0009
- perf: P1=0.5854, P3=0.4146

No product bands, no clinical claims. Synthetic fallback parameters only.
