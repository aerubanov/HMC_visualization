# Implementation Plan

Interactive React app for visualizing HMC and Gibbs sampling algorithms side-by-side.

## Features

- [Samples Comparison](plans/sampler-comparison-plan.md) — feature to use different sampler for different chains to compare it.
- [Sampler Comparison Fixes](plans/sampler-comparison-fixes-plan.md) — bug fixes and quality improvements for the samplers-comparison branch (race conditions, acceptance rate formula, test coverage).
- [Chain UI Improvements](plans/chain-ui-improvements-plan.md) — replace "Enable Second Chain" checkbox with Add/Remove buttons per chain; include sampler type in plot legends.
- [Code Quality Fixes](plans/code-quality-fixes-plan.md) — gitignore .claude/, trajectory deep-copy safety, chainErrors plain object + stale-error fix, TODO comment for error UI, syncChainsState tests.
- [Record Sampling](plans/record-sampling-plan.md) — "Start/Stop Recording" button that captures trajectory plot frames during sampling and downloads a GIF.
- [Sampler Comparison Post-Processing](plans/sampler-comparison-postprocessing-plan.md) — conditional R-hat/ESS/histogram logic: merge + R-hat when chains share a sampler type; skip R-hat, per-chain ESS, and side-by-side histograms when sampler types differ.
- [Stop Sampling](plans/stop-sampling-plan.md) — "Stop Sampling" button that cancels an in-progress standard-mode run early via a cancellation ref checked inside the requestAnimationFrame loop.
