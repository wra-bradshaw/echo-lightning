# Repository policy

## Protected files

- Do not modify README.md unless the user explicitly authorizes it.
- Do not modify files under .github/ without authorization.
- Do not modify AGENTS.md without explicit authorization.
- Do not create a docs folder or any new documentation markdown files without explicit authorization.
- Do not modify skills or anything under .agents without explicit authorization.

## Code style

- Do not add code comments, except for those read by external tools.

## Development philosophy

- Write your unit tests *before* you write any code for a function.
- Do not write low value tests. Remove any tests that you made "just to check" a specific thing. 
- The distribution of tests in different parts of the codebase should be roughly even. There shouldn't be 50 tests of one function and none somewhere else.
- Always verify your work with end to end testing and browser verification. Create tests that verify the feature has been implemented correctly, not that the code is present.
- Never test things that are verified already by our pnpm check.
- pnpm check must always pass.
- Make commits as you go using conventional, atomic commits.

