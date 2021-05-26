# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.15.0](https://github.com/expo/entity/compare/v0.14.1...v0.15.0) (2021-05-26)


### Bug Fixes

* upgrade ioredis, knex, and pg ([#125](https://github.com/expo/entity/issues/125)) ([7c43edf](https://github.com/expo/entity/commit/7c43edf3de37e8af13e2a99bd44f03f54803d9b9))


### Features

* secondary cache loader ([#123](https://github.com/expo/entity/issues/123)) ([4cba01e](https://github.com/expo/entity/commit/4cba01eb259c87d60b3026ce776e46f781363690))





## [0.14.1](https://github.com/expo/entity/compare/v0.14.0...v0.14.1) (2021-03-24)


### Bug Fixes

* typescript typedef of EntityMutationInfo ([#121](https://github.com/expo/entity/issues/121)) ([8e8f0dc](https://github.com/expo/entity/commit/8e8f0dc8636e343e29a6012d155e4111477a8989))





# [0.14.0](https://github.com/expo/entity/compare/v0.13.0...v0.14.0) (2021-03-24)


### Bug Fixes

* mutation validator and trigger cyclic import structure ([#118](https://github.com/expo/entity/issues/118)) ([b11dbc0](https://github.com/expo/entity/commit/b11dbc087ba5ad13c748032698dd73279b7960b0))





# [0.13.0](https://github.com/expo/entity/compare/v0.12.0...v0.13.0) (2021-02-12)


### Features

* add basic field type runtime validators ([#113](https://github.com/expo/entity/issues/113)) ([6c4d4b0](https://github.com/expo/entity/commit/6c4d4b03b5404dd776a12c5eb6f0af77a8c964f8))





# [0.12.0](https://github.com/expo/entity/compare/v0.11.0...v0.12.0) (2021-01-22)


### Bug Fixes

* move runInTransaction to ViewerContext ([#108](https://github.com/expo/entity/issues/108)) ([b7309e1](https://github.com/expo/entity/commit/b7309e18a2dd780b64cd306d566de1f12bf8df3a))
* remove cache and database adaptor flavor enums ([#109](https://github.com/expo/entity/issues/109)) ([72a77f8](https://github.com/expo/entity/commit/72a77f8b6893a4b76d3b1cce16659bdf3ce473ee))





# [0.11.0](https://github.com/expo/entity/compare/v0.10.0...v0.11.0) (2020-12-24)


### Features

* better cache adapter error handling ([#102](https://github.com/expo/entity/issues/102)) ([15546aa](https://github.com/expo/entity/commit/15546aad97734ab9ac67f1c012485f096a0e94f1))
* better database adapter error handling ([#101](https://github.com/expo/entity/issues/101)) ([5208aee](https://github.com/expo/entity/commit/5208aeedb0192f0460ba3d575770a04175f5c3aa))





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

* fix index export for EntityMutationTrigger and EntityMutationValidator ([#73](https://github.com/expo/entity/issues/73)) ([7e829f3](https://github.com/expo/entity/commit/7e829f30fde0bd343cb8a584ccda5530cf61ec33))
* move cache invalidation to after transaction commit ([#77](https://github.com/expo/entity/issues/77)) ([dbc3c81](https://github.com/expo/entity/commit/dbc3c81b359a668b5134189ce6de49b5893bb5e7))
* upgrade packages ([#78](https://github.com/expo/entity/issues/78)) ([9891e74](https://github.com/expo/entity/commit/9891e7469467a28589f529c8d87b10fc2232d3ff))





# [0.6.0](https://github.com/expo/entity/compare/v0.5.2...v0.6.0) (2020-07-23)


### Bug Fixes

* separate out EntityMutationValidator ([#68](https://github.com/expo/entity/issues/68)) ([547a1ef](https://github.com/expo/entity/commit/547a1efcecd17cc085702d1a3e9888ce5b644b13))


### Features

* entity mutation validators ([#67](https://github.com/expo/entity/issues/67)) ([fc4377d](https://github.com/expo/entity/commit/fc4377d8839da07417b88afc138f73556383d896))
* mutation triggers ([#65](https://github.com/expo/entity/issues/65)) ([fd6060c](https://github.com/expo/entity/commit/fd6060cc844f60635b3ce4c400c4877f2df8fa44))





## [0.5.2](https://github.com/expo/entity/compare/v0.5.1...v0.5.2) (2020-07-02)

**Note:** Version bump only for package @expo/entity-database-adapter-knex





## [0.5.1](https://github.com/expo/entity/compare/v0.5.0...v0.5.1) (2020-07-01)


### Bug Fixes

* correct some typing issues and exports ([#57](https://github.com/expo/entity/issues/57)) ([e91cfba](https://github.com/expo/entity/commit/e91cfba99321c2c4da2078aafd8627cbf0ceca50))





# 0.5.0 (2020-07-01)


### Features

* support entity fields subset of db fields ([#49](https://github.com/expo/entity/issues/49)) ([4e40b2e](https://github.com/expo/entity/commit/4e40b2e521407e521d236978ec3b3b56db3990be))
