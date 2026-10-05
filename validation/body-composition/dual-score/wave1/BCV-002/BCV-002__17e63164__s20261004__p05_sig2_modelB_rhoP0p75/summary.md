# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 2
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.8156 | 2.4018 | 0.4996 | 1.4868 |
| perf | 51.0000 | 140000 | true | 0.4936 | 4.7312 | 0.2001 | 4.0970 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.7727, H2=0.1726, H3=0.0547
- perf: P1=0.8420, P3=0.1580

No product bands, no clinical claims. Synthetic fallback parameters only.
