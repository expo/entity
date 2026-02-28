# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.56.0](https://github.com/expo/entity/compare/v0.55.0...v0.56.0) (2026-02-28)

### Bug Fixes

- Add default for TSelectedFields for application-instantiated types ([#438](https://github.com/expo/entity/issues/438)) ([3d4aa0e](https://github.com/expo/entity/commit/3d4aa0e9efa519a36f3db69bd8f117a993c100fa))
- Apply same viewer context subclass type mechanism to knexLoader and related methods ([#472](https://github.com/expo/entity/issues/472)) ([018a40b](https://github.com/expo/entity/commit/018a40bc01d579ffbf88f308e641921e6fc39097))
- correct discriminated union type for forward/backward pagination ([#474](https://github.com/expo/entity/issues/474)) ([90ae6e2](https://github.com/expo/entity/commit/90ae6e299bda26ac9a80d83e83334d4152c022dd))
- correct pagination behavior for standard pagination with descending ordering clauses ([#477](https://github.com/expo/entity/issues/477)) ([e32c4c2](https://github.com/expo/entity/commit/e32c4c2bcc05f225a556f95c90f1ee0f4e24de74))
- correct precedence parentheses for SQLFragment joins ([#476](https://github.com/expo/entity/issues/476)) ([2c4c649](https://github.com/expo/entity/commit/2c4c649a4bca5bc9ffdc41eb3135b2dfe4db5e57)), closes [/github.com/expo/entity/blob/main/packages/entity-database-adapter-knex/src/internal/EntityKnexDataManager.ts#L303](https://github.com//github.com/expo/entity/blob/main/packages/entity-database-adapter-knex/src/internal/EntityKnexDataManager.ts/issues/L303)
- eliminate some unnecessary any casts ([#448](https://github.com/expo/entity/issues/448)) ([cc78029](https://github.com/expo/entity/commit/cc78029117c14510b0934b5e0d19876a45570f8d))
- explicitly document behavior when cursor entity no longer exists ([#453](https://github.com/expo/entity/issues/453)) ([4dc156c](https://github.com/expo/entity/commit/4dc156c7a8dc50bc9e2802be133b9e258b289f54)), closes [#422](https://github.com/expo/entity/issues/422) [#431](https://github.com/expo/entity/issues/431)
- move EntityPrivacyUtils back into core package ([#429](https://github.com/expo/entity/issues/429)) ([56ec27d](https://github.com/expo/entity/commit/56ec27d5f201d83930a2cc05dfc380a054bff1e1))
- pass in augmentable classes to installation ([#437](https://github.com/expo/entity/issues/437)) ([f5c728b](https://github.com/expo/entity/commit/f5c728be565e01c0a8ace9ef51f6de8f49184dab)), closes [/github.com/expo/entity/pull/410#pullrequestreview-3765893898](https://github.com//github.com/expo/entity/pull/410/issues/pullrequestreview-3765893898)
- refactor install method to instead be free functions ([#441](https://github.com/expo/entity/issues/441)) ([51d632d](https://github.com/expo/entity/commit/51d632da1619dc039d5c41ce6533f63254ec4337)), closes [#410](https://github.com/expo/entity/issues/410)
- update integration test to use BlahEntity.knexLoader syntax ([#444](https://github.com/expo/entity/issues/444)) ([457f58a](https://github.com/expo/entity/commit/457f58ad2c4e1cf09f3132f3b9af5008ba0290c7)), closes [#441](https://github.com/expo/entity/issues/441)
- Use TSelectedFields for knex loader order by method ([#424](https://github.com/expo/entity/issues/424)) ([a9d09f4](https://github.com/expo/entity/commit/a9d09f42b67378d06133bcfb5b99c9afb17aac0d))

### Features

- add entity-database-adapter-knex-testing-utils containing StubPostgresDatabaseAdapter ([#412](https://github.com/expo/entity/issues/412)) ([eeccf59](https://github.com/expo/entity/commit/eeccf594c11bf090aa83bbf71fb4ead8668aec7d))
- add entityField SQL helper ([#481](https://github.com/expo/entity/issues/481)) ([459a5ff](https://github.com/expo/entity/commit/459a5ff85014a8c7396c0856dffacb1491ccb963))
- Add ilike and trigram similarity search to pagination ([#431](https://github.com/expo/entity/issues/431)) ([f72cbca](https://github.com/expo/entity/commit/f72cbcaf5a722e6bb8299644ec32b07f1d3362a9)), closes [#422](https://github.com/expo/entity/issues/422)
- add method to get pagination cursor for single entity ([#475](https://github.com/expo/entity/issues/475)) ([898f71c](https://github.com/expo/entity/commit/898f71ce082c2593585575b60bd6ef2546717124))
- Add paginated loader to entity-database-adapter-knex ([#422](https://github.com/expo/entity/issues/422)) ([58deffd](https://github.com/expo/entity/commit/58deffd426b0214073ede608cd47c04db2596d60))
- Add pagination max page size configuration ([#436](https://github.com/expo/entity/issues/436)) ([3ec4b5f](https://github.com/expo/entity/commit/3ec4b5f0cd53bf18d6bcfa27dd29b70d3f4d5f19))
- add PostgresEntity/ReadonlyPostgresEntity classes that expose knexLoader methods ([#442](https://github.com/expo/entity/issues/442)) ([40b409f](https://github.com/expo/entity/commit/40b409f6f889febf8b90b8837caecac26ff64174)), closes [#441](https://github.com/expo/entity/issues/441)
- Add raw sqlfragment orderBy capability for pagination ([#457](https://github.com/expo/entity/issues/457)) ([0615ffa](https://github.com/expo/entity/commit/0615ffacffbe9e903a9bf03b171c102f0554b992))
- add support for nulls ordering in order by clauses ([#468](https://github.com/expo/entity/issues/468)) ([6c0838d](https://github.com/expo/entity/commit/6c0838dc577a3b6190e3551ee834925d7bd53bc6))
- support nullable search fields with postgres transforms ([#470](https://github.com/expo/entity/issues/470)) ([53b0604](https://github.com/expo/entity/commit/53b0604152b8ca5ad9fc616d18478f93473c7eb0))

# [0.55.0](https://github.com/expo/entity/compare/v0.54.0...v0.55.0) (2026-01-27)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.54.0](https://github.com/expo/entity/compare/v0.53.0...v0.54.0) (2026-01-21)

### Bug Fixes

- **deps:** pin dependencies ([#328](https://github.com/expo/entity/issues/328)) ([5679f27](https://github.com/expo/entity/commit/5679f27209f1515ca5e626d858c4aa054b414625))

# [0.53.0](https://github.com/expo/entity/compare/v0.52.0...v0.53.0) (2025-12-19)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.52.0](https://github.com/expo/entity/compare/v0.51.0...v0.52.0) (2025-12-19)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.51.0](https://github.com/expo/entity/compare/v0.50.0...v0.51.0) (2025-11-21)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.50.0](https://github.com/expo/entity/compare/v0.49.0...v0.50.0) (2025-10-07)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.49.0](https://github.com/expo/entity/compare/v0.48.0...v0.49.0) (2025-10-07)

### Features

- throw specific errors for database adapter issues ([#311](https://github.com/expo/entity/issues/311)) ([f6639f9](https://github.com/expo/entity/commit/f6639f9def4ac20b628dd48fdca8d7cf61b6347b))

# [0.48.0](https://github.com/expo/entity/compare/v0.47.0...v0.48.0) (2025-09-19)

**Note:** Version bump only for package @expo/entity-database-adapter-knex

# [0.47.0](https://github.com/expo/entity/compare/v0.46.0...v0.47.0) (2025-09-19)

### Features

- add support for Buffer fields ([#305](https://github.com/expo/entity/issues/305)) ([31b52a5](https://github.com/expo/entity/commit/31b52a5f75842f4810f66c12ad03a10d9192f889))

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
