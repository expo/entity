# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.47.0](https://github.com/expo/entity/compare/v0.46.0...v0.47.0) (2025-09-19)

### Features

- add support for Buffer fields ([#305](https://github.com/expo/entity/issues/305)) ([31b52a5](https://github.com/expo/entity/commit/31b52a5f75842f4810f66c12ad03a10d9192f889))

# [0.46.0](https://github.com/expo/entity/compare/v0.45.0...v0.46.0) (2025-06-26)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.45.0](https://github.com/expo/entity/compare/v0.44.0...v0.45.0) (2025-06-06)

### Features

- add ability to define a custom cache key invalidation version supplier ([#290](https://github.com/expo/entity/issues/290)) ([a3ab61b](https://github.com/expo/entity/commit/a3ab61bfa8d2eab3bbd9c703c5e483184bb67f13))

# [0.44.0](https://github.com/expo/entity/compare/v0.43.0...v0.44.0) (2025-05-29)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.43.0](https://github.com/expo/entity/compare/v0.42.0...v0.43.0) (2025-04-10)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.42.0](https://github.com/expo/entity/compare/v0.41.0...v0.42.0) (2025-04-10)

### Features

- add @expo/entity-testing-utils package ([#280](https://github.com/expo/entity/issues/280)) ([485894a](https://github.com/expo/entity/commit/485894af16e233d533a9480285bbda56812cbe0b))
- add composite field loading and caching ([#272](https://github.com/expo/entity/issues/272)) ([f0aa0da](https://github.com/expo/entity/commit/f0aa0dafebdb56418cbd22dda437233d850db3e7))
- change entity id field generic to field name and derive type where necessary ([#278](https://github.com/expo/entity/issues/278)) ([b7e524c](https://github.com/expo/entity/commit/b7e524c41892797608d0b884410b8d520a80a9ef))
- convert batched/cached loader interface to holder pattern ([#271](https://github.com/expo/entity/issues/271)) ([06b3cb7](https://github.com/expo/entity/commit/06b3cb7f8076ef9e5b83cdf154da159801bd14cc)), closes [#201](https://github.com/expo/entity/issues/201)
- invalidate n+/-1 cacheKeyVersion for entities for push safety ([#275](https://github.com/expo/entity/issues/275)) ([d9c1852](https://github.com/expo/entity/commit/d9c1852706f98f0761ff24ddd244e4ed2beca580))

# [0.41.0](https://github.com/expo/entity/compare/v0.40.0...v0.41.0) (2025-03-07)

- feat!: Default all loaders and mutators to enforcing (#256) ([a976e76](https://github.com/expo/entity/commit/a976e765098bca27049585e43a3bed5c71b9ac6b)), closes [#256](https://github.com/expo/entity/issues/256)

### BREAKING CHANGES

- Default all loaders and mutators to enforcing

# [0.40.0](https://github.com/expo/entity/compare/v0.39.0...v0.40.0) (2025-02-27)

### Reverts

- Revert "v0.40.0" ([fa78ce8](https://github.com/expo/entity/commit/fa78ce84e2f2eb8199e36fd51779fc68905001c0))

# [0.39.0](https://github.com/expo/entity/compare/v0.38.0...v0.39.0) (2024-11-21)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.38.0](https://github.com/expo/entity/compare/v0.37.0...v0.38.0) (2024-06-27)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.37.0](https://github.com/expo/entity/compare/v0.36.0...v0.37.0) (2024-06-12)

### Bug Fixes

- update barrels ([#241](https://github.com/expo/entity/issues/241)) ([8c5f81b](https://github.com/expo/entity/commit/8c5f81bcca107e9b7bbea5f0ab41b0105057806e))

# [0.36.0](https://github.com/expo/entity/compare/v0.35.0...v0.36.0) (2024-06-12)

### Bug Fixes

- constrain entity fields type to string-keyed object ([#235](https://github.com/expo/entity/issues/235)) ([7e2cea1](https://github.com/expo/entity/commit/7e2cea16973a0ae1917f867cd25d6ef7c8eaecef))

# [0.35.0](https://github.com/expo/entity/compare/v0.34.0...v0.35.0) (2024-04-11)

### Bug Fixes

- Revert: require explicit query context specification ([#219](https://github.com/expo/entity/issues/219)) ([1bdfbd6](https://github.com/expo/entity/commit/1bdfbd6b562d1200e4029df0533b5adb2d917831))

# [0.34.0](https://github.com/expo/entity/compare/v0.33.0...v0.34.0) (2024-04-11)

### Features

- require explicit query context specification ([#219](https://github.com/expo/entity/issues/219)) ([8b0b31f](https://github.com/expo/entity/commit/8b0b31fdde5bd565aa527719003ef283a45f55cc))

# [0.33.0](https://github.com/expo/entity/compare/v0.32.0...v0.33.0) (2023-10-06)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.32.0](https://github.com/expo/entity/compare/v0.31.1...v0.32.0) (2023-06-10)

### Bug Fixes

- remove unused field from redis configuration ([#213](https://github.com/expo/entity/issues/213)) ([503a2fb](https://github.com/expo/entity/commit/503a2fb6a8d57f6a09f6da99daf5ab92fc3e7945))

### Features

- entity companion definition static thunk ([#210](https://github.com/expo/entity/issues/210)) ([4b18010](https://github.com/expo/entity/commit/4b18010d42be50ef329f428b08330e21bf676586))

# [0.31.0](https://github.com/expo/entity/compare/v0.30.0...v0.31.0) (2023-01-19)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.30.0](https://github.com/expo/entity/compare/v0.29.0...v0.30.0) (2022-12-23)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.29.0](https://github.com/expo/entity/compare/v0.28.0...v0.29.0) (2022-10-06)

### Features

- add example of redis mget batching using @expo/batcher ([#199](https://github.com/expo/entity/issues/199)) ([684f91b](https://github.com/expo/entity/commit/684f91b1f270851dbe331df2e2620664eea17266))
- change redis cache adapter to use redis-like interface ([#200](https://github.com/expo/entity/issues/200)) ([e381f5b](https://github.com/expo/entity/commit/e381f5b2acfc17dcade2cf6e8506fa1c1c255e73))

# [0.28.0](https://github.com/expo/entity/compare/v0.27.0...v0.28.0) (2022-09-13)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.27.0](https://github.com/expo/entity/compare/v0.26.1...v0.27.0) (2022-08-09)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

## [0.26.1](https://github.com/expo/entity/compare/v0.26.0...v0.26.1) (2022-07-28)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.26.0](https://github.com/expo/entity/compare/v0.25.3...v0.26.0) (2022-07-14)

### Features

- update ioredis to v5, make it a devDependency of the cache packages ([#172](https://github.com/expo/entity/issues/172)) ([9fcfbf7](https://github.com/expo/entity/commit/9fcfbf746a61554cefedf7fb0f1a3a9056b58ffe))

## [0.25.3](https://github.com/expo/entity/compare/v0.25.2...v0.25.3) (2022-03-12)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

## [0.25.2](https://github.com/expo/entity/compare/v0.25.1...v0.25.2) (2022-03-12)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

## [0.25.1](https://github.com/expo/entity/compare/v0.25.0...v0.25.1) (2022-03-10)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.25.0](https://github.com/expo/entity/compare/v0.24.0...v0.25.0) (2022-03-10)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.24.0](https://github.com/expo/entity/compare/v0.23.0...v0.24.0) (2022-02-16)

### Chores

- Refactor cachers to use an abstract class and interface ([#157](https://github.com/expo/entity/pull/157))

# [0.23.0](https://github.com/expo/entity/compare/v0.22.0...v0.23.0) (2022-02-09)

### Chores

- Move data transforming responsibilities to the CacheAdapter instead of the ReadThroughEntityCache. ([#153](https://github.com/expo/entity/pull/153))

# [0.22.0](https://github.com/expo/entity/compare/v0.21.0...v0.22.0) (2022-02-04)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.21.0](https://github.com/expo/entity/compare/v0.20.0...v0.21.0) (2022-01-03)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.20.0](https://github.com/expo/entity/compare/v0.19.0...v0.20.0) (2021-12-29)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.19.0](https://github.com/expo/entity/compare/v0.18.0...v0.19.0) (2021-10-28)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.18.0](https://github.com/expo/entity/compare/v0.17.0...v0.18.0) (2021-10-14)

### Features

- enable noImplicitOverride tsc setting ([#135](https://github.com/expo/entity/issues/135)) ([4263cb9](https://github.com/expo/entity/commit/4263cb9b8b69fe4fb68c74ec1c7aba04508a1555))
- upgrade TypeScript to 4.4 ([#134](https://github.com/expo/entity/issues/134)) ([7612392](https://github.com/expo/entity/commit/7612392dbfd9778d25c465c1626c372d75a6d05a))

# [0.17.0](https://github.com/expo/entity/compare/v0.16.0...v0.17.0) (2021-08-16)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.16.0](https://github.com/expo/entity/compare/v0.15.0...v0.16.0) (2021-07-07)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.15.0](https://github.com/expo/entity/compare/v0.14.1...v0.15.0) (2021-05-26)

### Bug Fixes

- upgrade ioredis, knex, and pg ([#125](https://github.com/expo/entity/issues/125)) ([7c43edf](https://github.com/expo/entity/commit/7c43edf3de37e8af13e2a99bd44f03f54803d9b9))
- use column name instead of field name for redis cache key ([#124](https://github.com/expo/entity/issues/124)) ([d78f452](https://github.com/expo/entity/commit/d78f452bb3ac5527069813a03f5b2264375bd8ab))

### Features

- secondary cache loader ([#123](https://github.com/expo/entity/issues/123)) ([4cba01e](https://github.com/expo/entity/commit/4cba01eb259c87d60b3026ce776e46f781363690))

## [0.14.1](https://github.com/expo/entity/compare/v0.14.0...v0.14.1) (2021-03-24)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.14.0](https://github.com/expo/entity/compare/v0.13.0...v0.14.0) (2021-03-24)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.13.0](https://github.com/expo/entity/compare/v0.12.0...v0.13.0) (2021-02-12)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.12.0](https://github.com/expo/entity/compare/v0.11.0...v0.12.0) (2021-01-22)

### Bug Fixes

- remove cache and database adaptor flavor enums ([#109](https://github.com/expo/entity/issues/109)) ([72a77f8](https://github.com/expo/entity/commit/72a77f8b6893a4b76d3b1cce16659bdf3ce473ee))

# [0.11.0](https://github.com/expo/entity/compare/v0.10.0...v0.11.0) (2020-12-24)

### Features

- better cache adapter error handling ([#102](https://github.com/expo/entity/issues/102)) ([15546aa](https://github.com/expo/entity/commit/15546aad97734ab9ac67f1c012485f096a0e94f1))

# [0.10.0](https://github.com/expo/entity/compare/v0.9.1...v0.10.0) (2020-11-17)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

## [0.9.1](https://github.com/expo/entity/compare/v0.9.0...v0.9.1) (2020-11-06)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.9.0](https://github.com/expo/entity/compare/v0.8.1...v0.9.0) (2020-11-05)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

## [0.8.1](https://github.com/expo/entity/compare/v0.8.0...v0.8.1) (2020-10-09)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.8.0](https://github.com/expo/entity/compare/v0.7.1...v0.8.0) (2020-10-09)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

## [0.7.1](https://github.com/expo/entity/compare/v0.7.0...v0.7.1) (2020-10-01)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# [0.7.0](https://github.com/expo/entity/compare/v0.6.0...v0.7.0) (2020-10-01)

### Bug Fixes

- upgrade packages ([#78](https://github.com/expo/entity/issues/78)) ([9891e74](https://github.com/expo/entity/commit/9891e7469467a28589f529c8d87b10fc2232d3ff))

# [0.6.0](https://github.com/expo/entity/compare/v0.5.2...v0.6.0) (2020-07-23)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

## [0.5.2](https://github.com/expo/entity/compare/v0.5.1...v0.5.2) (2020-07-02)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

## [0.5.1](https://github.com/expo/entity/compare/v0.5.0...v0.5.1) (2020-07-01)

**Note:** Version bump only for package @expo/entity-cache-adapter-redis

# 0.5.0 (2020-07-01)

### Features

- support entity fields subset of db fields ([#49](https://github.com/expo/entity/issues/49)) ([4e40b2e](https://github.com/expo/entity/commit/4e40b2e521407e521d236978ec3b3b56db3990be))
