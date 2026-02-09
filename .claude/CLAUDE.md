# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is Entity, a privacy-aware data layer for defining, caching, and authorizing access to application data models.

## Essential Development Commands

### Dependencies
- `yarn add` - Add a dependency. Run this only if necessary and ask before running.

### Building and Linting
- `yarn tsc` - Typecheck the code
- `yarn lint` - Run ESLint on source code
- `yarn ctix` - Build barrel index.ts files

### Testing
- `yarn test` - Run unit tests
- `yarn integration` - Run integration tests against dockerized environment

### Commit messages
- All PRs use conventional commits for their titles: https://www.conventionalcommits.org/

## Code conventions
- Backwards compatibility is a non-goal of refactorings of this library. Consumers rely upon typescript to know what needs to be migrated, so all breaking changes should be detectable via running typescript post-entity-version-upgrade in a consumer application that makes use of this package.
- Do not use jest's `test.skip`
- Prefer not to use dynamic imports for now
- Whenever technically correct, use typescript types for something instead of `any`