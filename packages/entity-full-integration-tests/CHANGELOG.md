# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.54.0](https://github.com/expo/entity/compare/v0.53.0...v0.54.0) (2026-01-21)

### Bug Fixes

- **deps:** pin dependencies ([#328](https://github.com/expo/entity/issues/328)) ([5679f27](https://github.com/expo/entity/commit/5679f27209f1515ca5e626d858c4aa054b414625))

# [0.53.0](https://github.com/expo/entity/compare/v0.52.0...v0.53.0) (2025-12-19)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.52.0](https://github.com/expo/entity/compare/v0.51.0...v0.52.0) (2025-12-19)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.51.0](https://github.com/expo/entity/compare/v0.50.0...v0.51.0) (2025-11-21)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.50.0](https://github.com/expo/entity/compare/v0.49.0...v0.50.0) (2025-10-07)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.49.0](https://github.com/expo/entity/compare/v0.48.0...v0.49.0) (2025-10-07)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.48.0](https://github.com/expo/entity/compare/v0.47.0...v0.48.0) (2025-09-19)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.47.0](https://github.com/expo/entity/compare/v0.46.0...v0.47.0) (2025-09-19)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.46.0](https://github.com/expo/entity/compare/v0.45.0...v0.46.0) (2025-06-26)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.45.0](https://github.com/expo/entity/compare/v0.44.0...v0.45.0) (2025-06-06)

### Features

- add ability to define a custom cache key invalidation version supplier ([#290](https://github.com/expo/entity/issues/290)) ([a3ab61b](https://github.com/expo/entity/commit/a3ab61bfa8d2eab3bbd9c703c5e483184bb67f13))

# [0.44.0](https://github.com/expo/entity/compare/v0.43.0...v0.44.0) (2025-05-29)

### Features

- add transaction-scoped dataloaders ([#284](https://github.com/expo/entity/issues/284)) ([e054a0d](https://github.com/expo/entity/commit/e054a0d74b3a39158ca7d73d05f59d3633113400)), closes [#98](https://github.com/expo/entity/issues/98) [#194](https://github.com/expo/entity/issues/194)

# [0.43.0](https://github.com/expo/entity/compare/v0.42.0...v0.43.0) (2025-04-10)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.42.0](https://github.com/expo/entity/compare/v0.41.0...v0.42.0) (2025-04-10)

### Features

- add @expo/entity-testing-utils package ([#280](https://github.com/expo/entity/issues/280)) ([485894a](https://github.com/expo/entity/commit/485894af16e233d533a9480285bbda56812cbe0b))
- change entity id field generic to field name and derive type where necessary ([#278](https://github.com/expo/entity/issues/278)) ([b7e524c](https://github.com/expo/entity/commit/b7e524c41892797608d0b884410b8d520a80a9ef))
- invalidate n+/-1 cacheKeyVersion for entities for push safety ([#275](https://github.com/expo/entity/issues/275)) ([d9c1852](https://github.com/expo/entity/commit/d9c1852706f98f0761ff24ddd244e4ed2beca580))

# [0.41.0](https://github.com/expo/entity/compare/v0.40.0...v0.41.0) (2025-03-07)

- feat!: Default all loaders and mutators to enforcing (#256) ([a976e76](https://github.com/expo/entity/commit/a976e765098bca27049585e43a3bed5c71b9ac6b)), closes [#256](https://github.com/expo/entity/issues/256)

### BREAKING CHANGES

- Default all loaders and mutators to enforcing

# [0.40.0](https://github.com/expo/entity/compare/v0.39.0...v0.40.0) (2025-02-27)

### Reverts

- Revert "v0.40.0" ([fa78ce8](https://github.com/expo/entity/commit/fa78ce84e2f2eb8199e36fd51779fc68905001c0))

# [0.39.0](https://github.com/expo/entity/compare/v0.38.0...v0.39.0) (2024-11-21)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.38.0](https://github.com/expo/entity/compare/v0.37.0...v0.38.0) (2024-06-27)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.37.0](https://github.com/expo/entity/compare/v0.36.0...v0.37.0) (2024-06-12)

### Bug Fixes

- update barrels ([#241](https://github.com/expo/entity/issues/241)) ([8c5f81b](https://github.com/expo/entity/commit/8c5f81bcca107e9b7bbea5f0ab41b0105057806e))

# [0.36.0](https://github.com/expo/entity/compare/v0.35.0...v0.36.0) (2024-06-12)

### Bug Fixes

- always reload entity after update since cascading changes may have changed it since commit ([#233](https://github.com/expo/entity/issues/233)) ([7c3c985](https://github.com/expo/entity/commit/7c3c9854a4dd91d4b73ebdb18bdeadea8b63f4c7))

# [0.35.0](https://github.com/expo/entity/compare/v0.34.0...v0.35.0) (2024-04-11)

### Bug Fixes

- Revert: require explicit query context specification ([#219](https://github.com/expo/entity/issues/219)) ([1bdfbd6](https://github.com/expo/entity/commit/1bdfbd6b562d1200e4029df0533b5adb2d917831))

# [0.34.0](https://github.com/expo/entity/compare/v0.33.0...v0.34.0) (2024-04-11)

### Features

- require explicit query context specification ([#219](https://github.com/expo/entity/issues/219)) ([8b0b31f](https://github.com/expo/entity/commit/8b0b31fdde5bd565aa527719003ef283a45f55cc))

# [0.33.0](https://github.com/expo/entity/compare/v0.32.0...v0.33.0) (2023-10-06)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.32.0](https://github.com/expo/entity/compare/v0.31.1...v0.32.0) (2023-06-10)

### Bug Fixes

- remove unused field from redis configuration ([#213](https://github.com/expo/entity/issues/213)) ([503a2fb](https://github.com/expo/entity/commit/503a2fb6a8d57f6a09f6da99daf5ab92fc3e7945))

### Features

- entity companion definition static thunk ([#210](https://github.com/expo/entity/issues/210)) ([4b18010](https://github.com/expo/entity/commit/4b18010d42be50ef329f428b08330e21bf676586))

# [0.31.0](https://github.com/expo/entity/compare/v0.30.0...v0.31.0) (2023-01-19)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.30.0](https://github.com/expo/entity/compare/v0.29.0...v0.30.0) (2022-12-23)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.29.0](https://github.com/expo/entity/compare/v0.28.0...v0.29.0) (2022-10-06)

### Features

- change redis cache adapter to use redis-like interface ([#200](https://github.com/expo/entity/issues/200)) ([e381f5b](https://github.com/expo/entity/commit/e381f5b2acfc17dcade2cf6e8506fa1c1c255e73))

# [0.28.0](https://github.com/expo/entity/compare/v0.27.0...v0.28.0) (2022-09-13)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.27.0](https://github.com/expo/entity/compare/v0.26.1...v0.27.0) (2022-08-09)

**Note:** Version bump only for package @expo/entity-full-integration-tests

## [0.26.1](https://github.com/expo/entity/compare/v0.26.0...v0.26.1) (2022-07-28)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.26.0](https://github.com/expo/entity/compare/v0.25.3...v0.26.0) (2022-07-14)

### Features

- add EntityEdgeDeletionBehavior.SET_NULL_INVALIDATE_CACHE_ONLY ([#178](https://github.com/expo/entity/issues/178)) ([a0c35dd](https://github.com/expo/entity/commit/a0c35ddd7bca05d0c3f41dcf48e16d058918231c))

## [0.25.3](https://github.com/expo/entity/compare/v0.25.2...v0.25.3) (2022-03-12)

**Note:** Version bump only for package @expo/entity-full-integration-tests

## [0.25.2](https://github.com/expo/entity/compare/v0.25.1...v0.25.2) (2022-03-12)

**Note:** Version bump only for package @expo/entity-full-integration-tests

## [0.25.1](https://github.com/expo/entity/compare/v0.25.0...v0.25.1) (2022-03-10)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.25.0](https://github.com/expo/entity/compare/v0.24.0...v0.25.0) (2022-03-10)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.24.0](https://github.com/expo/entity/compare/v0.23.0...v0.24.0) (2022-02-16)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.23.0](https://github.com/expo/entity/compare/v0.22.0...v0.23.0) (2022-02-09)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.22.0](https://github.com/expo/entity/compare/v0.21.0...v0.22.0) (2022-02-04)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.21.0](https://github.com/expo/entity/compare/v0.20.0...v0.21.0) (2022-01-03)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.20.0](https://github.com/expo/entity/compare/v0.19.0...v0.20.0) (2021-12-29)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.19.0](https://github.com/expo/entity/compare/v0.18.0...v0.19.0) (2021-10-28)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.18.0](https://github.com/expo/entity/compare/v0.17.0...v0.18.0) (2021-10-14)

### Features

- enable noImplicitOverride tsc setting ([#135](https://github.com/expo/entity/issues/135)) ([4263cb9](https://github.com/expo/entity/commit/4263cb9b8b69fe4fb68c74ec1c7aba04508a1555))
- upgrade TypeScript to 4.4 ([#134](https://github.com/expo/entity/issues/134)) ([7612392](https://github.com/expo/entity/commit/7612392dbfd9778d25c465c1626c372d75a6d05a))

# [0.17.0](https://github.com/expo/entity/compare/v0.16.0...v0.17.0) (2021-08-16)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.16.0](https://github.com/expo/entity/compare/v0.15.0...v0.16.0) (2021-07-07)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.15.0](https://github.com/expo/entity/compare/v0.14.1...v0.15.0) (2021-05-26)

### Bug Fixes

- upgrade ioredis, knex, and pg ([#125](https://github.com/expo/entity/issues/125)) ([7c43edf](https://github.com/expo/entity/commit/7c43edf3de37e8af13e2a99bd44f03f54803d9b9))

### Features

- secondary cache loader ([#123](https://github.com/expo/entity/issues/123)) ([4cba01e](https://github.com/expo/entity/commit/4cba01eb259c87d60b3026ce776e46f781363690))

## [0.14.1](https://github.com/expo/entity/compare/v0.14.0...v0.14.1) (2021-03-24)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.14.0](https://github.com/expo/entity/compare/v0.13.0...v0.14.0) (2021-03-24)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.13.0](https://github.com/expo/entity/compare/v0.12.0...v0.13.0) (2021-02-12)

### Features

- add basic field type runtime validators ([#113](https://github.com/expo/entity/issues/113)) ([6c4d4b0](https://github.com/expo/entity/commit/6c4d4b03b5404dd776a12c5eb6f0af77a8c964f8))

# [0.12.0](https://github.com/expo/entity/compare/v0.11.0...v0.12.0) (2021-01-22)

### Bug Fixes

- move runInTransaction to ViewerContext ([#108](https://github.com/expo/entity/issues/108)) ([b7309e1](https://github.com/expo/entity/commit/b7309e18a2dd780b64cd306d566de1f12bf8df3a))
- remove cache and database adaptor flavor enums ([#109](https://github.com/expo/entity/issues/109)) ([72a77f8](https://github.com/expo/entity/commit/72a77f8b6893a4b76d3b1cce16659bdf3ce473ee))

# [0.11.0](https://github.com/expo/entity/compare/v0.10.0...v0.11.0) (2020-12-24)

### Bug Fixes

- remove any cast from EntityLoader ([#100](https://github.com/expo/entity/issues/100)) ([b8e07f9](https://github.com/expo/entity/commit/b8e07f9ddc4077768980c000d61f5ddcc824e2e3))

# [0.10.0](https://github.com/expo/entity/compare/v0.9.1...v0.10.0) (2020-11-17)

**Note:** Version bump only for package @expo/entity-full-integration-tests

## [0.9.1](https://github.com/expo/entity/compare/v0.9.0...v0.9.1) (2020-11-06)

### Bug Fixes

- edge deletion behavior cyclic import structure again ([#93](https://github.com/expo/entity/issues/93)) ([012c05d](https://github.com/expo/entity/commit/012c05d62d2ecd559eb331c6ca358052bfe66dc8))

# [0.9.0](https://github.com/expo/entity/compare/v0.8.1...v0.9.0) (2020-11-05)

### Bug Fixes

- edge deletion behavior cyclic import structure ([#89](https://github.com/expo/entity/issues/89)) ([cca8fc1](https://github.com/expo/entity/commit/cca8fc19870057ebc7033081b59fab4a142fbf1a))

## [0.8.1](https://github.com/expo/entity/compare/v0.8.0...v0.8.1) (2020-10-09)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.8.0](https://github.com/expo/entity/compare/v0.7.1...v0.8.0) (2020-10-09)

**Note:** Version bump only for package @expo/entity-full-integration-tests

## [0.7.1](https://github.com/expo/entity/compare/v0.7.0...v0.7.1) (2020-10-01)

**Note:** Version bump only for package @expo/entity-full-integration-tests

# [0.7.0](https://github.com/expo/entity/compare/v0.6.0...v0.7.0) (2020-10-01)

### Bug Fixes

- move cache invalidation to after transaction commit ([#77](https://github.com/expo/entity/issues/77)) ([dbc3c81](https://github.com/expo/entity/commit/dbc3c81b359a668b5134189ce6de49b5893bb5e7))
- upgrade packages ([#78](https://github.com/expo/entity/issues/78)) ([9891e74](https://github.com/expo/entity/commit/9891e7469467a28589f529c8d87b10fc2232d3ff))
