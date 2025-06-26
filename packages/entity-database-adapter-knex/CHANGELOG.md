# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.46.0](https://github.com/expo/entity/compare/v0.45.0...v0.46.0) (2025-06-26)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.45.0](https://github.com/expo/entity/compare/v0.44.0...v0.45.0) (2025-06-06)

### Features

- add createOrGetExistingAsync and createWithUniqueConstraintRecoveryAsync utility methods ([#291](https://github.com/expo/entity/issues/291)) ([78bc264](https://github.com/expo/entity/commit/78bc264b3328692b4b6722388a57d298f02e65c5))

# [0.44.0](https://github.com/expo/entity/compare/v0.43.0...v0.44.0) (2025-05-29)

### Bug Fixes

- introduce transactional dataloader mode and fix global transaction ID generation ([#289](https://github.com/expo/entity/issues/289)) ([d3e89bd](https://github.com/expo/entity/commit/d3e89bdd82e6df5c5b35522bc3574fd9e1cfddff))

### Features

- add transaction-scoped dataloaders ([#284](https://github.com/expo/entity/issues/284)) ([e054a0d](https://github.com/expo/entity/commit/e054a0d74b3a39158ca7d73d05f59d3633113400)), closes [#98](https://github.com/expo/entity/issues/98) [#194](https://github.com/expo/entity/issues/194)

# [0.43.0](https://github.com/expo/entity/compare/v0.42.0...v0.43.0) (2025-04-10)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.42.0](https://github.com/expo/entity/compare/v0.41.0...v0.42.0) (2025-04-10)

### Features

- add @expo/entity-testing-utils package ([#280](https://github.com/expo/entity/issues/280)) ([485894a](https://github.com/expo/entity/commit/485894af16e233d533a9480285bbda56812cbe0b))
- add composite field loading and caching ([#272](https://github.com/expo/entity/issues/272)) ([f0aa0da](https://github.com/expo/entity/commit/f0aa0dafebdb56418cbd22dda437233d850db3e7))
- change entity id field generic to field name and derive type where necessary ([#278](https://github.com/expo/entity/issues/278)) ([b7e524c](https://github.com/expo/entity/commit/b7e524c41892797608d0b884410b8d520a80a9ef))
- convert batched/cached loader interface to holder pattern ([#271](https://github.com/expo/entity/issues/271)) ([06b3cb7](https://github.com/expo/entity/commit/06b3cb7f8076ef9e5b83cdf154da159801bd14cc)), closes [#201](https://github.com/expo/entity/issues/201)
- enforce explicit id field cache property ([#276](https://github.com/expo/entity/issues/276)) ([1da5cc0](https://github.com/expo/entity/commit/1da5cc01e1affc3b3338a0ab2050504b5853ac6f))

# [0.41.0](https://github.com/expo/entity/compare/v0.40.0...v0.41.0) (2025-03-07)

- feat!: Default all loaders and mutators to enforcing (#256) ([a976e76](https://github.com/expo/entity/commit/a976e765098bca27049585e43a3bed5c71b9ac6b)), closes [#256](https://github.com/expo/entity/issues/256)

### BREAKING CHANGES

- Default all loaders and mutators to enforcing

# [0.40.0](https://github.com/expo/entity/compare/v0.39.0...v0.40.0) (2025-02-27)

### Reverts

- Revert "v0.40.0" ([fa78ce8](https://github.com/expo/entity/commit/fa78ce84e2f2eb8199e36fd51779fc68905001c0))

# [0.39.0](https://github.com/expo/entity/compare/v0.38.0...v0.39.0) (2024-11-21)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.38.0](https://github.com/expo/entity/compare/v0.37.0...v0.38.0) (2024-06-27)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

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

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.32.0](https://github.com/expo/entity/compare/v0.31.1...v0.32.0) (2023-06-10)

### Features

- add ability to specify knex transaction config ([#207](https://github.com/expo/entity/issues/207)) ([2069a0d](https://github.com/expo/entity/commit/2069a0d9fd1d8f7d090a71a90a758b2429ea5dd3))
- entity companion definition static thunk ([#210](https://github.com/expo/entity/issues/210)) ([4b18010](https://github.com/expo/entity/commit/4b18010d42be50ef329f428b08330e21bf676586))

# [0.31.0](https://github.com/expo/entity/compare/v0.30.0...v0.31.0) (2023-01-19)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.30.0](https://github.com/expo/entity/compare/v0.29.0...v0.30.0) (2022-12-23)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.29.0](https://github.com/expo/entity/compare/v0.28.0...v0.29.0) (2022-10-06)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.28.0](https://github.com/expo/entity/compare/v0.27.0...v0.28.0) (2022-09-13)

### Features

- add BigIntField ([#193](https://github.com/expo/entity/issues/193)) ([acbad82](https://github.com/expo/entity/commit/acbad826a37bb5a054b4dcf9be91d11aa5f7f29a))
- nested transactions ([#194](https://github.com/expo/entity/issues/194)) ([a77b914](https://github.com/expo/entity/commit/a77b914ad6dc018d1e309c9caf4971088a553ecf))

# [0.27.0](https://github.com/expo/entity/compare/v0.26.1...v0.27.0) (2022-08-09)

### Features

- add orderByRaw to loadManyByRawWhereClauseAsync ([#185](https://github.com/expo/entity/issues/185)) ([2817d78](https://github.com/expo/entity/commit/2817d78392dfecd0093111c24d581bdf01dba06d))

## [0.26.1](https://github.com/expo/entity/compare/v0.26.0...v0.26.1) (2022-07-28)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.26.0](https://github.com/expo/entity/compare/v0.25.3...v0.26.0) (2022-07-14)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

## [0.25.3](https://github.com/expo/entity/compare/v0.25.2...v0.25.3) (2022-03-12)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

## [0.25.2](https://github.com/expo/entity/compare/v0.25.1...v0.25.2) (2022-03-12)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

## [0.25.1](https://github.com/expo/entity/compare/v0.25.0...v0.25.1) (2022-03-10)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.25.0](https://github.com/expo/entity/compare/v0.24.0...v0.25.0) (2022-03-10)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.24.0](https://github.com/expo/entity/compare/v0.23.0...v0.24.0) (2022-02-16)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.23.0](https://github.com/expo/entity/compare/v0.22.0...v0.23.0) (2022-02-09)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.22.0](https://github.com/expo/entity/compare/v0.21.0...v0.22.0) (2022-02-04)

### Features

- Upgrade knex to 1.x in `@expo/entity-database-adapter-knex` ([#150](https://github.com/expo/entity/issues/150)) ([e1b0ee5](https://github.com/expo/entity/commit/e1b0ee528175646239d88aa71ffce73983eeb52f))

# [0.21.0](https://github.com/expo/entity/compare/v0.20.0...v0.21.0) (2022-01-03)

### Features

- add pre-commit callbacks on EntityQueryContext ([#147](https://github.com/expo/entity/issues/147)) ([f1d9847](https://github.com/expo/entity/commit/f1d9847210f5775de964509e44ce493e44482b21))

# [0.20.0](https://github.com/expo/entity/compare/v0.19.0...v0.20.0) (2021-12-29)

### Features

- add cascading deletion info ([#145](https://github.com/expo/entity/issues/145)) ([3727191](https://github.com/expo/entity/commit/372719176742d3ead6b7cbca29cb66b09b3fe09c))

# [0.19.0](https://github.com/expo/entity/compare/v0.18.0...v0.19.0) (2021-10-28)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.18.0](https://github.com/expo/entity/compare/v0.17.0...v0.18.0) (2021-10-14)

### Features

- enable noImplicitOverride tsc setting ([#135](https://github.com/expo/entity/issues/135)) ([4263cb9](https://github.com/expo/entity/commit/4263cb9b8b69fe4fb68c74ec1c7aba04508a1555))
- upgrade TypeScript to 4.4 ([#134](https://github.com/expo/entity/issues/134)) ([7612392](https://github.com/expo/entity/commit/7612392dbfd9778d25c465c1626c372d75a6d05a))

# [0.17.0](https://github.com/expo/entity/compare/v0.16.0...v0.17.0) (2021-08-16)

### Features

- Add IntField and FloatField, deprecate NumberField ([#131](https://github.com/expo/entity/issues/131)) ([2f2d963](https://github.com/expo/entity/commit/2f2d963cf92c6575d78f8eeca344a4aadcc9b8d9))

# [0.16.0](https://github.com/expo/entity/compare/v0.15.0...v0.16.0) (2021-07-07)

### Features

- allow null field values in loadManyByFieldEqualityConjunctionAsync ([#130](https://github.com/expo/entity/issues/130)) ([2f37dc6](https://github.com/expo/entity/commit/2f37dc6a37d368b12b3c8375e04f0777fd448797))

# [0.15.0](https://github.com/expo/entity/compare/v0.14.1...v0.15.0) (2021-05-26)

### Bug Fixes

- upgrade ioredis, knex, and pg ([#125](https://github.com/expo/entity/issues/125)) ([7c43edf](https://github.com/expo/entity/commit/7c43edf3de37e8af13e2a99bd44f03f54803d9b9))

### Features

- secondary cache loader ([#123](https://github.com/expo/entity/issues/123)) ([4cba01e](https://github.com/expo/entity/commit/4cba01eb259c87d60b3026ce776e46f781363690))

## [0.14.1](https://github.com/expo/entity/compare/v0.14.0...v0.14.1) (2021-03-24)

### Bug Fixes

- typescript typedef of EntityMutationInfo ([#121](https://github.com/expo/entity/issues/121)) ([8e8f0dc](https://github.com/expo/entity/commit/8e8f0dc8636e343e29a6012d155e4111477a8989))

# [0.14.0](https://github.com/expo/entity/compare/v0.13.0...v0.14.0) (2021-03-24)

### Bug Fixes

- mutation validator and trigger cyclic import structure ([#118](https://github.com/expo/entity/issues/118)) ([b11dbc0](https://github.com/expo/entity/commit/b11dbc087ba5ad13c748032698dd73279b7960b0))

# [0.13.0](https://github.com/expo/entity/compare/v0.12.0...v0.13.0) (2021-02-12)

### Features

- add basic field type runtime validators ([#113](https://github.com/expo/entity/issues/113)) ([6c4d4b0](https://github.com/expo/entity/commit/6c4d4b03b5404dd776a12c5eb6f0af77a8c964f8))

# [0.12.0](https://github.com/expo/entity/compare/v0.11.0...v0.12.0) (2021-01-22)

### Bug Fixes

- move runInTransaction to ViewerContext ([#108](https://github.com/expo/entity/issues/108)) ([b7309e1](https://github.com/expo/entity/commit/b7309e18a2dd780b64cd306d566de1f12bf8df3a))
- remove cache and database adaptor flavor enums ([#109](https://github.com/expo/entity/issues/109)) ([72a77f8](https://github.com/expo/entity/commit/72a77f8b6893a4b76d3b1cce16659bdf3ce473ee))

# [0.11.0](https://github.com/expo/entity/compare/v0.10.0...v0.11.0) (2020-12-24)

### Features

- better cache adapter error handling ([#102](https://github.com/expo/entity/issues/102)) ([15546aa](https://github.com/expo/entity/commit/15546aad97734ab9ac67f1c012485f096a0e94f1))
- better database adapter error handling ([#101](https://github.com/expo/entity/issues/101)) ([5208aee](https://github.com/expo/entity/commit/5208aeedb0192f0460ba3d575770a04175f5c3aa))

# [0.10.0](https://github.com/expo/entity/compare/v0.9.1...v0.10.0) (2020-11-17)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

## [0.9.1](https://github.com/expo/entity/compare/v0.9.0...v0.9.1) (2020-11-06)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.9.0](https://github.com/expo/entity/compare/v0.8.1...v0.9.0) (2020-11-05)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

## [0.8.1](https://github.com/expo/entity/compare/v0.8.0...v0.8.1) (2020-10-09)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.8.0](https://github.com/expo/entity/compare/v0.7.1...v0.8.0) (2020-10-09)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

## [0.7.1](https://github.com/expo/entity/compare/v0.7.0...v0.7.1) (2020-10-01)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.7.0](https://github.com/expo/entity/compare/v0.6.0...v0.7.0) (2020-10-01)

### Bug Fixes

- fix index export for EntityMutationTrigger and EntityMutationValidator ([#73](https://github.com/expo/entity/issues/73)) ([7e829f3](https://github.com/expo/entity/commit/7e829f30fde0bd343cb8a584ccda5530cf61ec33))
- move cache invalidation to after transaction commit ([#77](https://github.com/expo/entity/issues/77)) ([dbc3c81](https://github.com/expo/entity/commit/dbc3c81b359a668b5134189ce6de49b5893bb5e7))
- upgrade packages ([#78](https://github.com/expo/entity/issues/78)) ([9891e74](https://github.com/expo/entity/commit/9891e7469467a28589f529c8d87b10fc2232d3ff))

# [0.6.0](https://github.com/expo/entity/compare/v0.5.2...v0.6.0) (2020-07-23)

### Bug Fixes

- separate out EntityMutationValidator ([#68](https://github.com/expo/entity/issues/68)) ([547a1ef](https://github.com/expo/entity/commit/547a1efcecd17cc085702d1a3e9888ce5b644b13))

### Features

- entity mutation validators ([#67](https://github.com/expo/entity/issues/67)) ([fc4377d](https://github.com/expo/entity/commit/fc4377d8839da07417b88afc138f73556383d896))
- mutation triggers ([#65](https://github.com/expo/entity/issues/65)) ([fd6060c](https://github.com/expo/entity/commit/fd6060cc844f60635b3ce4c400c4877f2df8fa44))

## [0.5.2](https://github.com/expo/entity/compare/v0.5.1...v0.5.2) (2020-07-02)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

## [0.5.1](https://github.com/expo/entity/compare/v0.5.0...v0.5.1) (2020-07-01)

### Bug Fixes

- correct some typing issues and exports ([#57](https://github.com/expo/entity/issues/57)) ([e91cfba](https://github.com/expo/entity/commit/e91cfba99321c2c4da2078aafd8627cbf0ceca50))

# 0.5.0 (2020-07-01)

### Features

- support entity fields subset of db fields ([#49](https://github.com/expo/entity/issues/49)) ([4e40b2e](https://github.com/expo/entity/commit/4e40b2e521407e521d236978ec3b3b56db3990be))
