# BCV-030 — Aggregate uncertainty propagation

- persona: P-07 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 65.0082 | 120000 | true | 0.9753 | 2.8240 | 0.4989 | 2.0848 |
| perf | 52.6377 | 130000 | true | 1.7436 | 5.0593 | 0.5013 | 6.6834 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.4901, H2=0.0542, H3=0.4556
- perf: P1=1.0787, P3=-0.0787

No product bands, no clinical claims. Synthetic fallback parameters only.
