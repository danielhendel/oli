# BCV-002 — Measurement perturbation

- persona: P-01 (male), sigma multiplier: 1.5
- model: B (rho=0.75)
- expected correlations: corr(FM,FFM)=0.75, corr(FFM,ALM)=0.75, corr(FM,ALM)=0.5625 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 92.1618 | 120000 | true | 0.5217 | 1.5225 | 0.5007 | 0.6020 |
| perf | 91.0000 | 170000 | true | 0.4605 | 3.5322 | 0.4996 | 1.8313 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.9911, H2=0.0000, H3=0.0089
- perf: P1=1.0000, P3=0.0000

No product bands, no clinical claims. Synthetic fallback parameters only.
