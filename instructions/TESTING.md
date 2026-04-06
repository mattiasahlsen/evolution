# Testing Guidelines

- We use vitest version ^3.2.4
- Wherever possible we should have snapshot tests for regression testing
  - See _src/simulation/simulation.test.ts_ for the pattern
  - We use `toMatchFileSnapshot` from vitest
  - This is to be able to do refactoring with confidence that the logic haven't changed
- On top of the snapshot tests, we should have tests for business logic
  - We should be able to test business logic in isolation. If we can't, the architecture is defective and need refactoring
