# Stage 2 Source Privacy Risk Acceptance

## Decision

Product leadership authorizes Stage 2 merge without further disposable-account
creation.

## Accepted evidence

- final physical-iPhone functional PASS;
- exact runtime SHA:
  `255f7101db7a111471ca38b92813cb426e762007`;
- no runtime change afterward;
- static account-scoped source-gate review;
- focused source-gate tests;
- complete local repository gate;
- no production deployment.

## Missing evidence

The two-disposable-account server-side source inventory, RawEvent, log,
backfill, repair, marker, and cross-account evidence matrix was not completed
because the historical accounts could not be identified unambiguously.

## Risk statement

An earlier pre-fix build demonstrated that Apple Health steps and backfill could
run without a valid account-level source connection.

The current branch contains explicit account-scoped gate corrections and
regression tests, but the complete final-SHA server-side proof remains deferred.

## Leadership disposition

The missing evidence does not block:

- Stage 2 merge;
- continued internal staging development;
- Stage 3A Body Composition definition and audit.

It does block:

- external TestFlight;
- production deployment;
- public release.

## New release gate

RG-SOURCE-PRIVACY-01

Required before external distribution:

Automated end-to-end proof that an unconnected account cannot query, ingest,
backfill, repair, or inherit Apple Health/Oura source state.

The test must not depend on repeated manual creation of disposable email
accounts.

## Claims

Do not claim full source-privacy verification PASS.

Use:

Leadership-accepted residual risk; RG-SOURCE-PRIVACY-01 OPEN.

## Production

No production environment was used.

No staging data was mutated by this documentation decision.
