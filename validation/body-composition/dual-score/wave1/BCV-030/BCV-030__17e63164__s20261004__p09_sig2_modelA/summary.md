# BCV-030 — Aggregate uncertainty propagation

- persona: P-09 (male), sigma multiplier: 2
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 72.7270 | 120000 | true | 1.1817 | 3.4402 | 0.4969 | 3.0709 |
| perf | 89.5833 | 180000 | true | 0.8816 | 2.5637 | 0.5001 | 1.7064 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7951, H2=0.2049, H3=0.0000
- perf: P1=-0.0032, P3=1.0032

No product bands, no clinical claims. Synthetic fallback parameters only.
