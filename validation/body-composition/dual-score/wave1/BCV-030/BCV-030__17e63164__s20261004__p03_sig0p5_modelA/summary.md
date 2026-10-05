# BCV-030 — Aggregate uncertainty propagation

- persona: P-03 (male), sigma multiplier: 0.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 77.8000 | 120000 | true | 0.2417 | 0.7057 | 0.5000 | 0.1297 |
| perf | 55.2857 | 120000 | true | 0.8522 | 2.4882 | 0.4991 | 1.6011 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4460, H2=0.0000, H3=0.5540
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
