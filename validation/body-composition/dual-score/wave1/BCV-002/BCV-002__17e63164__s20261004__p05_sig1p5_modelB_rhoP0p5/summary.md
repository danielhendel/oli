# BCV-002 — Measurement perturbation

- persona: P-05 (male), sigma multiplier: 1.5
- model: B (rho=0.5)
- expected correlations: corr(FM,FFM)=0.5, corr(FFM,ALM)=0.5, corr(FM,ALM)=0.25 (= rho^2 for Model B)
- parameter label: exploratory_normalized_not_empirical (exploratory; not empirical)

| score | S0 | draws | converged | median abs delta | p95 abs delta | reversal prob | Var(A) |
|---|---|---|---|---|---|---|---|
| health | 74.5647 | 120000 | true | 0.5954 | 1.7365 | 0.5003 | 0.7866 |
| perf | 51.0000 | 120000 | true | 0.2327 | 2.5039 | 0.1361 | 1.4888 |

Construct uncertainty share (signed, unclipped; null when Var(A) <= EPS_NUM):

- health: H1=0.8195, H2=0.1646, H3=0.0159
- perf: P1=0.8014, P3=0.1986

No product bands, no clinical claims. Synthetic fallback parameters only.
