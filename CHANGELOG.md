# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.55.0](https://github.com/expo/entity/compare/v0.54.0...v0.55.0) (2026-01-27)

### Bug Fixes

- **deps:** update dependency @apollo/server to v5.3.0 ([#403](https://github.com/expo/entity/issues/403)) ([b758c4d](https://github.com/expo/entity/commit/b758c4d344294797430de0afb88e47f558b6fa8d))

### Features

- add AllowIf[Any|All]SubRulesAllowPrivacyPolicyRule rules ([#401](https://github.com/expo/entity/issues/401)) ([5db8977](https://github.com/expo/entity/commit/5db89777c605eda9a8393227ceeb641e460dc463))
- Add AllowIfInParentCascadeDeletionPrivacyPolicyRule ([#399](https://github.com/expo/entity/issues/399)) ([56ed357](https://github.com/expo/entity/commit/56ed357b923a8374a3c120e3eef5d487d5fb2f9c))
- add EvaluateIfEntityFieldPredicatePrivacyPolicyRule ([#400](https://github.com/expo/entity/issues/400)) ([f3b575c](https://github.com/expo/entity/commit/f3b575cd00d47c747cf45e96c6db7857592b0f93))

# [0.54.0](https://github.com/expo/entity/compare/v0.53.0...v0.54.0) (2026-01-21)

### Bug Fixes

- **deps:** pin dependencies ([#328](https://github.com/expo/entity/issues/328)) ([5679f27](https://github.com/expo/entity/commit/5679f27209f1515ca5e626d858c4aa054b414625))
- **deps:** pin dependency @apollo/server to 4.12.2 ([#330](https://github.com/expo/entity/issues/330)) ([7038912](https://github.com/expo/entity/commit/7038912ca5e5b203ebbca4b46bda5612e7660eac))
- **deps:** pin dependency @koa/bodyparser to 6.0.0 ([#339](https://github.com/expo/entity/issues/339)) ([9f93926](https://github.com/expo/entity/commit/9f939269cf843059ec0ac729d470db074730348e))
- **deps:** pin dependency koa to 2.16.3 ([#331](https://github.com/expo/entity/issues/331)) ([ce55922](https://github.com/expo/entity/commit/ce55922e3ec6692a9ea4847427dc475902174830))
- Inline map().filter() loops in EntityLoaderUtils ([#369](https://github.com/expo/entity/issues/369)) ([ea6c128](https://github.com/expo/entity/commit/ea6c128d9c8fc21484645796f79e1aa8839dd395))
- run tsc during tests CI job ([#373](https://github.com/expo/entity/issues/373)) ([1cc57ed](https://github.com/expo/entity/commit/1cc57eddce72663cff17a5102afa6c3e8248aee4))

### Features

- synthetically set cascading set-null fields to null during canViewerDeleteAsync evaluation ([#376](https://github.com/expo/entity/issues/376)) ([544bb7c](https://github.com/expo/entity/commit/544bb7c3f2f41419cb3b779f7e3d968e09455fa0))

# [0.53.0](https://github.com/expo/entity/compare/v0.52.0...v0.53.0) (2025-12-19)

**Note:** Version bump only for package root

# [0.52.0](https://github.com/expo/entity/compare/v0.51.0...v0.52.0) (2025-12-19)

### Features

- switch local cache to an interface ([#322](https://github.com/expo/entity/issues/322)) ([c453726](https://github.com/expo/entity/commit/c4537262d810ea01e519f9aec6ae5b17a54ce936))

# [0.51.0](https://github.com/expo/entity/compare/v0.50.0...v0.51.0) (2025-11-21)

### Bug Fixes

- add default for TSelectedFields in PrivacyPolicyTestUtils Case ([#316](https://github.com/expo/entity/issues/316)) ([2f9d487](https://github.com/expo/entity/commit/2f9d4873aaefe891920c25a41088f7c467da6113))

# [0.50.0](https://github.com/expo/entity/compare/v0.49.0...v0.50.0) (2025-10-07)

### Bug Fixes

- make in memory and stub database adapters behave more similarly to sql ([#315](https://github.com/expo/entity/issues/315)) ([0f53c24](https://github.com/expo/entity/commit/0f53c24faff8a994906e630d7f17d67d89ff5b0f)), closes [#311](https://github.com/expo/entity/issues/311)

# [0.49.0](https://github.com/expo/entity/compare/v0.48.0...v0.49.0) (2025-10-07)

### Bug Fixes

- add readonly modifier to partitionArray utility method ([#307](https://github.com/expo/entity/issues/307)) ([077d53c](https://github.com/expo/entity/commit/077d53cd86d4c54132ea2ebcc59d1d75e2b507d0))
- validate that UUID field is lower-case ([#310](https://github.com/expo/entity/issues/310)) ([949f00d](https://github.com/expo/entity/commit/949f00d93b52e405188b9b23e23ae59ce1c546de)), closes [/github.com/expo/entity/blob/077d53cd86d4c54132ea2ebcc59d1d75e2b507d0/packages/entity/src/EntityDatabaseAdapter.ts#L182](https://github.com//github.com/expo/entity/blob/077d53cd86d4c54132ea2ebcc59d1d75e2b507d0/packages/entity/src/EntityDatabaseAdapter.ts/issues/L182) [#309](https://github.com/expo/entity/issues/309)

### Features

- add more documentation to entity errors ([#312](https://github.com/expo/entity/issues/312)) ([4c3fd17](https://github.com/expo/entity/commit/4c3fd175a91cf3107b1ac413e39e52e051a9dc4b))
- throw specific errors for database adapter issues ([#311](https://github.com/expo/entity/issues/311)) ([f6639f9](https://github.com/expo/entity/commit/f6639f9def4ac20b628dd48fdca8d7cf61b6347b))

# [0.48.0](https://github.com/expo/entity/compare/v0.47.0...v0.48.0) (2025-09-19)

**Note:** Version bump only for package root

# [0.47.0](https://github.com/expo/entity/compare/v0.46.0...v0.47.0) (2025-09-19)

### Features

- add support for Buffer fields ([#305](https://github.com/expo/entity/issues/305)) ([31b52a5](https://github.com/expo/entity/commit/31b52a5f75842f4810f66c12ad03a10d9192f889))
- allow manual specification of cascadingDeleteCause in delete mutator factory method ([#306](https://github.com/expo/entity/issues/306)) ([4a3eda2](https://github.com/expo/entity/commit/4a3eda209fa747ee093ca3053b3196bf9a52193d))

# [0.46.0](https://github.com/expo/entity/compare/v0.45.0...v0.46.0) (2025-06-26)

**Note:** Version bump only for package root

# [0.45.0](https://github.com/expo/entity/compare/v0.44.0...v0.45.0) (2025-06-06)

### Features

- add ability to define a custom cache key invalidation version supplier ([#290](https://github.com/expo/entity/issues/290)) ([a3ab61b](https://github.com/expo/entity/commit/a3ab61bfa8d2eab3bbd9c703c5e483184bb67f13))
- add createOrGetExistingAsync and createWithUniqueConstraintRecoveryAsync utility methods ([#291](https://github.com/expo/entity/issues/291)) ([78bc264](https://github.com/expo/entity/commit/78bc264b3328692b4b6722388a57d298f02e65c5))

# [0.44.0](https://github.com/expo/entity/compare/v0.43.0...v0.44.0) (2025-05-29)

### Bug Fixes

- introduce transactional dataloader mode and fix global transaction ID generation ([#289](https://github.com/expo/entity/issues/289)) ([d3e89bd](https://github.com/expo/entity/commit/d3e89bdd82e6df5c5b35522bc3574fd9e1cfddff))

### Features

- add transaction-scoped dataloaders ([#284](https://github.com/expo/entity/issues/284)) ([e054a0d](https://github.com/expo/entity/commit/e054a0d74b3a39158ca7d73d05f59d3633113400)), closes [#98](https://github.com/expo/entity/issues/98) [#194](https://github.com/expo/entity/issues/194)

# [0.43.0](https://github.com/expo/entity/compare/v0.42.0...v0.43.0) (2025-04-10)

### Bug Fixes

- fix generated tsc definition sentinel type visibility ([#283](https://github.com/expo/entity/issues/283)) ([9758fd5](https://github.com/expo/entity/commit/9758fd5df8695a8121258cd988c0c79ce8a3e4b6))

# [0.42.0](https://github.com/expo/entity/compare/v0.41.0...v0.42.0) (2025-04-10)

### Bug Fixes

- fix metrics for dataloader waterfall logging ([#267](https://github.com/expo/entity/issues/267)) ([1d95eba](https://github.com/expo/entity/commit/1d95eba1f9efb67164c3affc917c9b2514e1529f))
- move source of truth of loader docblocks to enforcing loader since it is not the default loader ([#264](https://github.com/expo/entity/issues/264)) ([aa56b70](https://github.com/expo/entity/commit/aa56b705db115cf760125208eb2d3585a3794e58))

### Features

- add @expo/entity-testing-utils package ([#280](https://github.com/expo/entity/issues/280)) ([485894a](https://github.com/expo/entity/commit/485894af16e233d533a9480285bbda56812cbe0b))
- add composite field loading and caching ([#272](https://github.com/expo/entity/issues/272)) ([f0aa0da](https://github.com/expo/entity/commit/f0aa0dafebdb56418cbd22dda437233d850db3e7))
- add some utility classes and methods in preparation for composite keys ([#269](https://github.com/expo/entity/issues/269)) ([ad41af1](https://github.com/expo/entity/commit/ad41af1c826fb267f5e463771107c85802578a19)), closes [#201](https://github.com/expo/entity/issues/201)
- change entity id field generic to field name and derive type where necessary ([#278](https://github.com/expo/entity/issues/278)) ([b7e524c](https://github.com/expo/entity/commit/b7e524c41892797608d0b884410b8d520a80a9ef))
- convert batched/cached loader interface to holder pattern ([#271](https://github.com/expo/entity/issues/271)) ([06b3cb7](https://github.com/expo/entity/commit/06b3cb7f8076ef9e5b83cdf154da159801bd14cc)), closes [#201](https://github.com/expo/entity/issues/201)
- enforce explicit id field cache property ([#276](https://github.com/expo/entity/issues/276)) ([1da5cc0](https://github.com/expo/entity/commit/1da5cc01e1affc3b3338a0ab2050504b5853ac6f))
- invalidate n+/-1 cacheKeyVersion for entities for push safety ([#275](https://github.com/expo/entity/issues/275)) ([d9c1852](https://github.com/expo/entity/commit/d9c1852706f98f0761ff24ddd244e4ed2beca580))

# [0.41.0](https://github.com/expo/entity/compare/v0.40.0...v0.41.0) (2025-03-07)

- feat!: Default all loaders and mutators to enforcing (#256) ([a976e76](https://github.com/expo/entity/commit/a976e765098bca27049585e43a3bed5c71b9ac6b)), closes [#256](https://github.com/expo/entity/issues/256)

### Features

- Create codemod for v0.40.0 -> v0.41.0 ([#260](https://github.com/expo/entity/issues/260)) ([4a2b61f](https://github.com/expo/entity/commit/4a2b61f2bd8edfc19109ef4c8ac780eaf0f7795c))

### BREAKING CHANGES

- Default all loaders and mutators to enforcing

# [0.40.0](https://github.com/expo/entity/compare/v0.39.0...v0.40.0) (2025-02-27)

### Features

- Create codemod for v0.39.0 -> v0.40.0 ([#259](https://github.com/expo/entity/issues/259)) ([d63ddd6](https://github.com/expo/entity/commit/d63ddd65997a441a914a71b158a111339970aeab))

### Reverts

- Revert "v0.40.0" ([fa78ce8](https://github.com/expo/entity/commit/fa78ce84e2f2eb8199e36fd51779fc68905001c0))

# [0.39.0](https://github.com/expo/entity/compare/v0.38.0...v0.39.0) (2024-11-21)

### Features

- add function to get authorization results for canViewerUpdateAsync/canViewerDeleteAsync ([#249](https://github.com/expo/entity/issues/249)) ([27a358d](https://github.com/expo/entity/commit/27a358d259503aa8d7d7413bfc1e52e0974dc626))

# [0.38.0](https://github.com/expo/entity/compare/v0.37.0...v0.38.0) (2024-06-27)

### Features

- add EntityEdgeDeletionAuthorizationInferenceBehavior for canViewerDeleteAsync ([#243](https://github.com/expo/entity/issues/243)) ([162b192](https://github.com/expo/entity/commit/162b19257ac720c94fb84d64808fb75748adcdc7))

# [0.37.0](https://github.com/expo/entity/compare/v0.36.0...v0.37.0) (2024-06-12)

### Bug Fixes

- update barrels ([#241](https://github.com/expo/entity/issues/241)) ([8c5f81b](https://github.com/expo/entity/commit/8c5f81bcca107e9b7bbea5f0ab41b0105057806e))

# [0.36.0](https://github.com/expo/entity/compare/v0.35.0...v0.36.0) (2024-06-12)

### Breaking Changes

- make using non-enforcing entity loader explicit ([#238](https://github.com/expo/entity/issues/238)) ([2edc7af](https://github.com/expo/entity/commit/2edc7af7e20c362688ff2ee674fa2245205d6de4))

### Bug Fixes

- always reload entity after update since cascading changes may have changed it since commit ([#233](https://github.com/expo/entity/issues/233)) ([7c3c985](https://github.com/expo/entity/commit/7c3c9854a4dd91d4b73ebdb18bdeadea8b63f4c7))
- constrain entity fields type to string-keyed object ([#235](https://github.com/expo/entity/issues/235)) ([7e2cea1](https://github.com/expo/entity/commit/7e2cea16973a0ae1917f867cd25d6ef7c8eaecef))
- disallow keys of JS Object prototype for safety ([#236](https://github.com/expo/entity/issues/236)) ([05726d4](https://github.com/expo/entity/commit/05726d45fa9b91a6b25ddbc9c7e3e097b02097ca))

### Features

- Add global mutation trigger field to EntityCompanionProvider ([#215](https://github.com/expo/entity/issues/215)) ([6569486](https://github.com/expo/entity/commit/6569486ecddf2fd33c626f634c761e06636b1730))
- add previousValue to privacy policy context for updates ([#232](https://github.com/expo/entity/issues/232)) ([af495a9](https://github.com/expo/entity/commit/af495a9a856a5042f00cfd150348e415139cb85e))
- Add StrictEnumField with better validation ([#222](https://github.com/expo/entity/issues/222)) ([8753252](https://github.com/expo/entity/commit/87532525d090b3a67f1cedd95ac990f7dcb3ab5d))
- make canViewerDeleteAsync recursive ([#224](https://github.com/expo/entity/issues/224)) ([60fc9a4](https://github.com/expo/entity/commit/60fc9a4c4b587b866f2f5a1b3bd22145bc77e6e9))
- Use uuid v7 in stub database adapter ([#234](https://github.com/expo/entity/issues/234)) ([1e8ea64](https://github.com/expo/entity/commit/1e8ea64017430a2ce5ea197678bd78713ad77ecd))
- move entity loader utils into their own object ([#239](https://github.com/expo/entity/issues/239))([93905be](https://github.com/expo/entity/commit/93905be81cf74c5626ca19358794261c17223f95))

# [0.35.0](https://github.com/expo/entity/compare/v0.34.0...v0.35.0) (2024-04-11)

### Bug Fixes

- Revert: require explicit query context specification ([#219](https://github.com/expo/entity/issues/219)) ([1bdfbd6](https://github.com/expo/entity/commit/1bdfbd6b562d1200e4029df0533b5adb2d917831))

# [0.34.0](https://github.com/expo/entity/compare/v0.33.0...v0.34.0) (2024-04-11)

### Features

- Allow UUIDv6/7/8 in UUIDField validation ([#221](https://github.com/expo/entity/issues/221)) ([cc6f3dc](https://github.com/expo/entity/commit/cc6f3dc1e677382eec220723c37b5b883d980372))
- require explicit query context specification ([#219](https://github.com/expo/entity/issues/219)) ([8b0b31f](https://github.com/expo/entity/commit/8b0b31fdde5bd565aa527719003ef283a45f55cc))

# [0.33.0](https://github.com/expo/entity/compare/v0.32.0...v0.33.0) (2023-10-06)

### Features

- add loadManyByIDsNullableAsync loader method ([#214](https://github.com/expo/entity/issues/214)) ([aad94ac](https://github.com/expo/entity/commit/aad94aca479ac07cc7f76b5e1a122ff85a2d1542))

# [0.32.0](https://github.com/expo/entity/compare/v0.31.1...v0.32.0) (2023-06-10)

### Bug Fixes

- remove unused field from redis configuration ([#213](https://github.com/expo/entity/issues/213)) ([503a2fb](https://github.com/expo/entity/commit/503a2fb6a8d57f6a09f6da99daf5ab92fc3e7945))

### Features

- add ability to specify knex transaction config ([#207](https://github.com/expo/entity/issues/207)) ([2069a0d](https://github.com/expo/entity/commit/2069a0d9fd1d8f7d090a71a90a758b2429ea5dd3))
- entity companion definition static thunk ([#210](https://github.com/expo/entity/issues/210)) ([4b18010](https://github.com/expo/entity/commit/4b18010d42be50ef329f428b08330e21bf676586))

# [0.31.1](https://github.com/expo/entity/compare/v0.31.0...v0.31.1) (2023-03-06)

### Features

- add loadFirstByFieldEqualityConjunction, a convenience method ([#206](https://github.com/expo/entity/pull/206)) ([1934216](https://github.com/expo/entity/commit/1934216b70572cf2b9693e0f14939f49b90427dd))

# [0.31.0](https://github.com/expo/entity/compare/v0.30.0...v0.31.0) (2023-01-19)

**Note:** Version bump only for package root

# [0.30.0](https://github.com/expo/entity/compare/v0.29.0...v0.30.0) (2022-12-23)

**Note:** Version bump only for package root

# [0.29.0](https://github.com/expo/entity/compare/v0.28.0...v0.29.0) (2022-10-06)

### Features

- add example of redis mget batching using @expo/batcher ([#199](https://github.com/expo/entity/issues/199)) ([684f91b](https://github.com/expo/entity/commit/684f91b1f270851dbe331df2e2620664eea17266))
- change redis cache adapter to use redis-like interface ([#200](https://github.com/expo/entity/issues/200)) ([e381f5b](https://github.com/expo/entity/commit/e381f5b2acfc17dcade2cf6e8506fa1c1c255e73))

# [0.28.0](https://github.com/expo/entity/compare/v0.27.0...v0.28.0) (2022-09-13)

### Features

- add BigIntField ([#193](https://github.com/expo/entity/issues/193)) ([acbad82](https://github.com/expo/entity/commit/acbad826a37bb5a054b4dcf9be91d11aa5f7f29a))
- nested transactions ([#194](https://github.com/expo/entity/issues/194)) ([a77b914](https://github.com/expo/entity/commit/a77b914ad6dc018d1e309c9caf4971088a553ecf))

# [0.27.0](https://github.com/expo/entity/compare/v0.26.1...v0.27.0) (2022-08-09)

### Features

- add orderByRaw to loadManyByRawWhereClauseAsync ([#185](https://github.com/expo/entity/issues/185)) ([2817d78](https://github.com/expo/entity/commit/2817d78392dfecd0093111c24d581bdf01dba06d))

## [0.26.1](https://github.com/expo/entity/compare/v0.26.0...v0.26.1) (2022-07-28)

### Features

- recache to higher cache levels when loading from a composed cache ([#182](https://github.com/expo/entity/pull/182))

# [0.26.0](https://github.com/expo/entity/compare/v0.25.3...v0.26.0) (2022-07-14)

### Bug Fixes

- fix workflow branch specification ([#179](https://github.com/expo/entity/issues/179)) ([25d14bf](https://github.com/expo/entity/commit/25d14bf8c1688524ad488aa2b63221393a4f0b05))

### Features

- add EntityEdgeDeletionBehavior.SET_NULL_INVALIDATE_CACHE_ONLY ([#178](https://github.com/expo/entity/issues/178)) ([a0c35dd](https://github.com/expo/entity/commit/a0c35ddd7bca05d0c3f41dcf48e16d058918231c))
- update ioredis to v5, make it a devDependency of the cache packages ([#172](https://github.com/expo/entity/issues/172)) ([9fcfbf7](https://github.com/expo/entity/commit/9fcfbf746a61554cefedf7fb0f1a3a9056b58ffe))

## [0.25.3](https://github.com/expo/entity/compare/v0.25.2...v0.25.3) (2022-03-12)

### Bug Fixes

- lock lru-cache to v6.0.0 ([#170](https://github.com/expo/entity/issues/170)) ([293868b](https://github.com/expo/entity/commit/293868b1a73df9f749216af68b1ae94ac22ac2b9))

## [0.25.2](https://github.com/expo/entity/compare/v0.25.1...v0.25.2) (2022-03-12)

### Bug Fixes

- lru-cache yarn workspace version resolution ([#168](https://github.com/expo/entity/issues/168)) ([e76ca8c](https://github.com/expo/entity/commit/e76ca8c2f72da84aa372a64ef1898ade220ed0a8))

## [0.25.1](https://github.com/expo/entity/compare/v0.25.0...v0.25.1) (2022-03-10)

### Bug Fixes

- add composed cache to index ([#166](https://github.com/expo/entity/issues/166)) ([5c82edc](https://github.com/expo/entity/commit/5c82edcd9f26854878d29950a05852e117bbd723))

# [0.25.0](https://github.com/expo/entity/compare/v0.24.0...v0.25.0) (2022-03-10)

### Features

- composed cache adapter, composed secondary cache, local memory secondary cache ([#164](https://github.com/expo/entity/issues/164)) ([6b6e70e](https://github.com/expo/entity/commit/6b6e70e75f7e42a4dce13edeb406a4d88d9264f0))
- privacy policy evaluation context ([#162](https://github.com/expo/entity/issues/162)) ([3a81a4c](https://github.com/expo/entity/commit/3a81a4c059e2e995eb800e35e76b3d432c22b23f))

# [0.24.0](https://github.com/expo/entity/compare/v0.23.0...v0.24.0) (2022-02-16)

### Features

- add local memory cache package ([#158](https://github.com/expo/entity/issues/158)) ([85d3575](https://github.com/expo/entity/commit/85d35752fa0919a62efb776a762a6829e83ca7af))

### Chores

- Refactor cachers to use an abstract class and interface ([#157](https://github.com/expo/entity/pull/157))

# [0.23.0](https://github.com/expo/entity/compare/v0.22.0...v0.23.0) (2022-02-09)

### Breaking changes

- Move data transforming responsibilities to the CacheAdapter instead of the ReadThroughEntityCache. Affects any classes extending the EntityCacheAdapter and relying on the transformation behavior of the ReadThroughEntityCache. ([#153](https://github.com/expo/entity/pull/153))

# [0.22.0](https://github.com/expo/entity/compare/v0.21.0...v0.22.0) (2022-02-04)

### Features

- Upgrade knex to 1.x in `@expo/entity-database-adapter-knex` ([#150](https://github.com/expo/entity/issues/150)) ([e1b0ee5](https://github.com/expo/entity/commit/e1b0ee528175646239d88aa71ffce73983eeb52f))

# [0.21.0](https://github.com/expo/entity/compare/v0.20.0...v0.21.0) (2022-01-03)

### Features

- add pre-commit callbacks on EntityQueryContext ([#147](https://github.com/expo/entity/issues/147)) ([f1d9847](https://github.com/expo/entity/commit/f1d9847210f5775de964509e44ce493e44482b21))

# [0.20.0](https://github.com/expo/entity/compare/v0.19.0...v0.20.0) (2021-12-29)

### Bug Fixes

- separate post-commit invalidation callbacks from trigger and user callbacks ([#144](https://github.com/expo/entity/issues/144)) ([efa131e](https://github.com/expo/entity/commit/efa131ef29532accf0e51b6d867ffe15a27b4c90))

### Features

- add cascading deletion info ([#145](https://github.com/expo/entity/issues/145)) ([3727191](https://github.com/expo/entity/commit/372719176742d3ead6b7cbca29cb66b09b3fe09c))

# [0.19.0](https://github.com/expo/entity/compare/v0.18.0...v0.19.0) (2021-10-28)

### Features

- add authorization metrics ([#142](https://github.com/expo/entity/issues/142)) ([7cf54d8](https://github.com/expo/entity/commit/7cf54d83c52e104159a3e2e675cdda2d29afe204))
- add IP support ([#138](https://github.com/expo/entity/issues/138)) ([1405a91](https://github.com/expo/entity/commit/1405a9126ee3a56c3e2a38bf3b697283744f5b5d))

# [0.18.0](https://github.com/expo/entity/compare/v0.17.0...v0.18.0) (2021-10-14)

### Features

- enable noImplicitOverride tsc setting ([#135](https://github.com/expo/entity/issues/135)) ([4263cb9](https://github.com/expo/entity/commit/4263cb9b8b69fe4fb68c74ec1c7aba04508a1555))
- expose describeFieldTestCase for use in other packages ([#139](https://github.com/expo/entity/issues/139)) ([1220477](https://github.com/expo/entity/commit/1220477aa331349b482ad015b44f76fa2bda7b90))
- upgrade TypeScript to 4.4 ([#134](https://github.com/expo/entity/issues/134)) ([7612392](https://github.com/expo/entity/commit/7612392dbfd9778d25c465c1626c372d75a6d05a))
- use better QueryContext types for transactional triggers and validators ([#136](https://github.com/expo/entity/issues/136)) ([5c7efe1](https://github.com/expo/entity/commit/5c7efe1678424ff907687e9327175bdc2538c3e0))

# [0.17.0](https://github.com/expo/entity/compare/v0.16.0...v0.17.0) (2021-08-16)

### Features

- Add IntField and FloatField, deprecate NumberField ([#131](https://github.com/expo/entity/issues/131)) ([2f2d963](https://github.com/expo/entity/commit/2f2d963cf92c6575d78f8eeca344a4aadcc9b8d9))

# [0.16.0](https://github.com/expo/entity/compare/v0.15.0...v0.16.0) (2021-07-07)

### Features

- allow null field values in loadManyByFieldEqualityConjunctionAsync ([#130](https://github.com/expo/entity/issues/130)) ([2f37dc6](https://github.com/expo/entity/commit/2f37dc6a37d368b12b3c8375e04f0777fd448797))

# [0.15.0](https://github.com/expo/entity/compare/v0.14.1...v0.15.0) (2021-05-26)

### Bug Fixes

- upgrade ioredis, knex, and pg ([#125](https://github.com/expo/entity/issues/125)) ([7c43edf](https://github.com/expo/entity/commit/7c43edf3de37e8af13e2a99bd44f03f54803d9b9))
- upgrade some other packages to fix dependabot alerts ([#126](https://github.com/expo/entity/issues/126)) ([226bffe](https://github.com/expo/entity/commit/226bffe0a95d7b8a3e9e9d46aebdb0edf1eeec1a))
- use column name instead of field name for redis cache key ([#124](https://github.com/expo/entity/issues/124)) ([d78f452](https://github.com/expo/entity/commit/d78f452bb3ac5527069813a03f5b2264375bd8ab))

### Features

- secondary cache loader ([#123](https://github.com/expo/entity/issues/123)) ([4cba01e](https://github.com/expo/entity/commit/4cba01eb259c87d60b3026ce776e46f781363690))

## [0.14.1](https://github.com/expo/entity/compare/v0.14.0...v0.14.1) (2021-03-24)

### Bug Fixes

- typescript typedef of EntityMutationInfo ([#121](https://github.com/expo/entity/issues/121)) ([8e8f0dc](https://github.com/expo/entity/commit/8e8f0dc8636e343e29a6012d155e4111477a8989))

# [0.14.0](https://github.com/expo/entity/compare/v0.13.0...v0.14.0) (2021-03-24)

### Bug Fixes

- mutation validator and trigger cyclic import structure ([#118](https://github.com/expo/entity/issues/118)) ([b11dbc0](https://github.com/expo/entity/commit/b11dbc087ba5ad13c748032698dd73279b7960b0))

### Features

- add mutation type to validator and trigger execute functions ([#119](https://github.com/expo/entity/issues/119)) ([ef40fa5](https://github.com/expo/entity/commit/ef40fa5e9cdf53e25e78a9423c698e6d1c9737af))

# [0.13.0](https://github.com/expo/entity/compare/v0.12.0...v0.13.0) (2021-02-12)

### Bug Fixes

- allow undefined value for all fields ([#114](https://github.com/expo/entity/issues/114)) ([022e0e9](https://github.com/expo/entity/commit/022e0e9b88a5e84e0c1bc6c8810c850beb05f0cf))

### Features

- add basic field type runtime validators ([#113](https://github.com/expo/entity/issues/113)) ([6c4d4b0](https://github.com/expo/entity/commit/6c4d4b03b5404dd776a12c5eb6f0af77a8c964f8))

# [0.12.0](https://github.com/expo/entity/compare/v0.11.0...v0.12.0) (2021-01-22)

### Bug Fixes

- move runInTransaction to ViewerContext ([#108](https://github.com/expo/entity/issues/108)) ([b7309e1](https://github.com/expo/entity/commit/b7309e18a2dd780b64cd306d566de1f12bf8df3a))
- remove cache and database adaptor flavor enums ([#109](https://github.com/expo/entity/issues/109)) ([72a77f8](https://github.com/expo/entity/commit/72a77f8b6893a4b76d3b1cce16659bdf3ce473ee))

### Features

- better typing on filterMap for use with predicates ([#106](https://github.com/expo/entity/issues/106)) ([01b3bfe](https://github.com/expo/entity/commit/01b3bfef7c6da55e7d89d8cccb52a0050187aee8))

# [0.11.0](https://github.com/expo/entity/compare/v0.10.0...v0.11.0) (2020-12-24)

### Bug Fixes

- add type generic default in test utils ([#104](https://github.com/expo/entity/issues/104)) ([fe2917e](https://github.com/expo/entity/commit/fe2917e6b5af808f166aa354d476e168c41e6d21))
- maps utils invariants for collections containing undefined values ([#103](https://github.com/expo/entity/issues/103)) ([29c1a43](https://github.com/expo/entity/commit/29c1a434ab6cd8d30e9f0e7c742065c8d46d8d8a))
- remove any cast from EntityLoader ([#100](https://github.com/expo/entity/issues/100)) ([b8e07f9](https://github.com/expo/entity/commit/b8e07f9ddc4077768980c000d61f5ddcc824e2e3))

### Features

- better cache adapter error handling ([#102](https://github.com/expo/entity/issues/102)) ([15546aa](https://github.com/expo/entity/commit/15546aad97734ab9ac67f1c012485f096a0e94f1))
- better database adapter error handling ([#101](https://github.com/expo/entity/issues/101)) ([5208aee](https://github.com/expo/entity/commit/5208aeedb0192f0460ba3d575770a04175f5c3aa))

# [0.10.0](https://github.com/expo/entity/compare/v0.9.1...v0.10.0) (2020-11-17)

### Bug Fixes

- fix null handling in load paths (try 2) ([#96](https://github.com/expo/entity/issues/96)) ([d960329](https://github.com/expo/entity/commit/d9603298e0cc5c3c2b0cca959876e9195555fb57))

## [0.9.1](https://github.com/expo/entity/compare/v0.9.0...v0.9.1) (2020-11-06)

### Bug Fixes

- edge deletion behavior cyclic import structure again ([#93](https://github.com/expo/entity/issues/93)) ([012c05d](https://github.com/expo/entity/commit/012c05d62d2ecd559eb331c6ca358052bfe66dc8))

# [0.9.0](https://github.com/expo/entity/compare/v0.8.1...v0.9.0) (2020-11-05)

### Bug Fixes

- edge deletion behavior cyclic import structure ([#89](https://github.com/expo/entity/issues/89)) ([cca8fc1](https://github.com/expo/entity/commit/cca8fc19870057ebc7033081b59fab4a142fbf1a))

### Features

- add ability to invalidate an entity manually ([#91](https://github.com/expo/entity/issues/91)) ([d1a6f13](https://github.com/expo/entity/commit/d1a6f1339648942f12b3fb605eb329aefe5cdd63))

## [0.8.1](https://github.com/expo/entity/compare/v0.8.0...v0.8.1) (2020-10-09)

**Note:** Version bump only for package root

# [0.8.0](https://github.com/expo/entity/compare/v0.7.1...v0.8.0) (2020-10-09)

### Features

- add entityClassName to metrics adapter events ([#83](https://github.com/expo/entity/issues/83)) ([f4cdc01](https://github.com/expo/entity/commit/f4cdc01c6cb8868c24ce3da2274f0901687e05bd))

## [0.7.1](https://github.com/expo/entity/compare/v0.7.0...v0.7.1) (2020-10-01)

### Bug Fixes

- correct type of runInTransactionAsync ([#81](https://github.com/expo/entity/issues/81)) ([f98f7d1](https://github.com/expo/entity/commit/f98f7d14b6149a496a7a3e97dd63d89b2842cc26))

# [0.7.0](https://github.com/expo/entity/compare/v0.6.0...v0.7.0) (2020-10-01)

### Bug Fixes

- fix incorrect loader types for field selecitons ([#72](https://github.com/expo/entity/issues/72)) ([cd2df8d](https://github.com/expo/entity/commit/cd2df8da4b81bcd4769e950d3124c18886df2816))
- fix index export for EntityMutationTrigger and EntityMutationValidator ([#73](https://github.com/expo/entity/issues/73)) ([7e829f3](https://github.com/expo/entity/commit/7e829f30fde0bd343cb8a584ccda5530cf61ec33))
- move cache invalidation to after transaction commit ([#77](https://github.com/expo/entity/issues/77)) ([dbc3c81](https://github.com/expo/entity/commit/dbc3c81b359a668b5134189ce6de49b5893bb5e7))
- upgrade packages ([#78](https://github.com/expo/entity/issues/78)) ([9891e74](https://github.com/expo/entity/commit/9891e7469467a28589f529c8d87b10fc2232d3ff))

# [0.6.0](https://github.com/expo/entity/compare/v0.5.2...v0.6.0) (2020-07-23)

### Bug Fixes

- ensure transitive deletion triggers are run for CASCADE_DELETE_INVALIDATE_CACHE ([#66](https://github.com/expo/entity/issues/66)) ([5744c51](https://github.com/expo/entity/commit/5744c51e6b3178bd9f229f3f465b683bb4474c8a))
- separate out EntityMutationValidator ([#68](https://github.com/expo/entity/issues/68)) ([547a1ef](https://github.com/expo/entity/commit/547a1efcecd17cc085702d1a3e9888ce5b644b13))
- update setField to correct typing ([#62](https://github.com/expo/entity/issues/62)) ([7a77afc](https://github.com/expo/entity/commit/7a77afc83ea732c9b062a5d6865eff9d3131d015))

### Features

- entity mutation validators ([#67](https://github.com/expo/entity/issues/67)) ([fc4377d](https://github.com/expo/entity/commit/fc4377d8839da07417b88afc138f73556383d896))
- mutation triggers ([#65](https://github.com/expo/entity/issues/65)) ([fd6060c](https://github.com/expo/entity/commit/fd6060cc844f60635b3ce4c400c4877f2df8fa44))

## [0.5.2](https://github.com/expo/entity/compare/v0.5.1...v0.5.2) (2020-07-02)

### Bug Fixes

- fix stub cache key generation for global cache ([#59](https://github.com/expo/entity/issues/59)) ([7c180e8](https://github.com/expo/entity/commit/7c180e84d9a8cdfd9380fac0eab2d02a96ec18f3))

## [0.5.1](https://github.com/expo/entity/compare/v0.5.0...v0.5.1) (2020-07-01)

### Bug Fixes

- correct some typing issues and exports ([#57](https://github.com/expo/entity/issues/57)) ([e91cfba](https://github.com/expo/entity/commit/e91cfba99321c2c4da2078aafd8627cbf0ceca50))

# 0.5.0 (2020-07-01)

### Bug Fixes

- support number ID field generation in StubDatabaseAdapter ([#43](https://github.com/expo/entity/issues/43)) ([60cc0fb](https://github.com/expo/entity/commit/60cc0fbda460c3ada1f5244a2780f90382fe3ebd))
- upgrade Apollo server for security advisory ([#38](https://github.com/expo/entity/issues/38)) ([d25c1e1](https://github.com/expo/entity/commit/d25c1e142d52385725593f4f155d1795697ab490))

### Features

- add two fan out methods to association loader ([#52](https://github.com/expo/entity/issues/52)) ([89cfb3d](https://github.com/expo/entity/commit/89cfb3d5a01d4da90f64acc52ae1b839ba348a35))
- support entity fields subset of db fields ([#49](https://github.com/expo/entity/issues/49)) ([4e40b2e](https://github.com/expo/entity/commit/4e40b2e521407e521d236978ec3b3b56db3990be))

# 0.4.0 (2020-06-03)

- All Packages
  - Documentation Improvements
  - CI & Coverage
  - TypeScript 3.9 ([#18](https://github.com/expo/entity/pull/18))
- `@expo/entity`
  - Enforcing mutator convenience functions ([#5](https://github.com/expo/entity/pull/5))
  - `loadByIDNullable` loader method ([#28](https://github.com/expo/entity/pull/28))
  - Add ability to check update and delete policies outside of mutation ([#30](https://github.com/expo/entity/pull/30))
- `@expo/entity-cache-adapter-redis`
- `@expo/entity-database-adapter-knex`
  - Throw when database adapter receives unexpected mutation results ([#31](https://github.com/expo/entity/pull/31))
- `@expo/entity-example`
  - Initial Version

# 0.3.0 (2020-04-28)

- `@expo/entity`
  - Initial Version
- `@expo/entity-cache-adapter-redis`
  - Initial Version
- `@expo/entity-database-adapter-knex`
  - Initial Version
