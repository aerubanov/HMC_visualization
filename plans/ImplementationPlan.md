# Implementation Plan

Interactive React app for visualizing HMC and Gibbs sampling algorithms side-by-side.

## Features

- [Samples Comparison](plans/sampler-comparison-plan.md) — feature to use different sampler for different chains to compare it.
- [Sampler Comparison Fixes](plans/sampler-comparison-fixes-plan.md) — bug fixes and quality improvements for the samplers-comparison branch (race conditions, acceptance rate formula, test coverage).
- [Chain UI Improvements](plans/chain-ui-improvements-plan.md) — replace "Enable Second Chain" checkbox with Add/Remove buttons per chain; include sampler type in plot legends.
- [Code Quality Fixes](plans/code-quality-fixes-plan.md) — gitignore .claude/, trajectory deep-copy safety, chainErrors plain object + stale-error fix, TODO comment for error UI, syncChainsState tests.
