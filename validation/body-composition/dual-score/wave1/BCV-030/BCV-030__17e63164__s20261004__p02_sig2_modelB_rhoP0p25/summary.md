# BCV-030 — Aggregate uncertainty propagation

- persona: P-02 (male), sigma multiplier: 2
- model: B (rho=0.25)
- expected correlations: corr(FM,FFM)=0.25, corr(FFM,ALM)=0.25, corr(FM,ALM)=0.0625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 73.1000 | 120000 | true | 1.0752 | 3.0827 | 0.4748 | 2.3653 |
| perf | 88.8261 | 330000 | true | 1.9757 | 4.7561 | 0.4999 | 5.8648 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8632, H2=0.0001, H3=0.1366
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
