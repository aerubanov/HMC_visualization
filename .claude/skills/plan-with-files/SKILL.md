---
name: plan-with-files
description: Work plan files for a project and/or individual feature implementation. Use it when asked to create or update a plan file.
---

Before writing any code, do research and create a work plan in a separate file in the `plans/` directory.

- Use plans/ImplementationPlan.md to get general idea about project and its features.
- ImplementationPlan should be updated with new features as they are planned, but it should not contain detailed implementation steps. It should be more like a table of contents for the actual feature plans.
- For each feature, create an implementation plan and put it into separate file in plans/<feature_name>-plan.md
- When planning new feature, do not write any code, just do high-level planing: modules, classes, test cases and there description in text.
- Feature plan should include following sections:
  1. **Objective**: What is the goal of this feature? What problem does it solve?
  2. **Modules/Classes**: What are the main components (modules, classes) that need to be implemented or modified for this feature? Briefly describe their responsibilities.
  3. **Test Cases**: What are the key test cases that should be implemented to verify the correctness of this feature? Describe each test case in terms of its purpose and what it validates.
- Try to keep plan short and structured.
- If some changes are requested for initial plan, do not create new files with plan, just edit existing one.
