---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

Interview the user relentlessly about every aspect of this plan until all significant design branches are resolved.

For each question:

1. If the codebase can answer it, explore first (Read/Bash) and present the finding — only ask the user if genuinely ambiguous.
2. Otherwise, ask the question. Provide options, it pros and cons, and your recommended answer.
3. Walk the decision tree depth-first: fully resolve one branch before opening the next.

Continue asking one question at a time until all major dimensions are resolved: architecture, data flow, edge cases, constraints, failure modes, integration points.

When all branches are resolved, output a structured summary titled "## Design Decisions" listing each resolved decision as a bullet: "**Topic**: chosen approach — reason".
