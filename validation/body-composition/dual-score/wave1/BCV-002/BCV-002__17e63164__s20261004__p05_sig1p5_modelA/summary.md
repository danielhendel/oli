# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 1.5
- model: A (independent DXA; NOT Model B at rho=0)
- expected correlations: corr(FM,FFM)=0, corr(FFM,ALM)=0, corr(FM,ALM)=0 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5937 | 1.7195 | 0.5003 | 0.7719 |
| perf | 51.0000 | 120000 | true | 0.1774 | 2.3423 | 0.1230 | 1.3591 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8255, H2=0.1618, H3=0.0127
- perf: P1=0.8207, P3=0.1793

No product bands, no clinical claims. Synthetic fallback parameters only.
