# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.8.1](https://github.com/expo/entity/compare/v0.8.0...v0.8.1) (2020-10-09)

**Note:** Version bump only for package @expo/entity





# [0.8.0](https://github.com/expo/entity/compare/v0.7.1...v0.8.0) (2020-10-09)


### Features

* add entityClassName to metrics adapter events ([#83](https://github.com/expo/entity/issues/83)) ([f4cdc01](https://github.com/expo/entity/commit/f4cdc01c6cb8868c24ce3da2274f0901687e05bd))





## [0.7.1](https://github.com/expo/entity/compare/v0.7.0...v0.7.1) (2020-10-01)


### Bug Fixes

* correct type of runInTransactionAsync ([#81](https://github.com/expo/entity/issues/81)) ([f98f7d1](https://github.com/expo/entity/commit/f98f7d14b6149a496a7a3e97dd63d89b2842cc26))





# [0.7.0](https://github.com/expo/entity/compare/v0.6.0...v0.7.0) (2020-10-01)


### Bug Fixes

* fix incorrect loader types for field selecitons ([#72](https://github.com/expo/entity/issues/72)) ([cd2df8d](https://github.com/expo/entity/commit/cd2df8da4b81bcd4769e950d3124c18886df2816))
* fix index export for EntityMutationTrigger and EntityMutationValidator ([#73](https://github.com/expo/entity/issues/73)) ([7e829f3](https://github.com/expo/entity/commit/7e829f30fde0bd343cb8a584ccda5530cf61ec33))
* move cache invalidation to after transaction commit ([#77](https://github.com/expo/entity/issues/77)) ([dbc3c81](https://github.com/expo/entity/commit/dbc3c81b359a668b5134189ce6de49b5893bb5e7))
* upgrade packages ([#78](https://github.com/expo/entity/issues/78)) ([9891e74](https://github.com/expo/entity/commit/9891e7469467a28589f529c8d87b10fc2232d3ff))





# [0.6.0](https://github.com/expo/entity/compare/v0.5.2...v0.6.0) (2020-07-23)


### Bug Fixes

* ensure transitive deletion triggers are run for CASCADE_DELETE_INVALIDATE_CACHE ([#66](https://github.com/expo/entity/issues/66)) ([5744c51](https://github.com/expo/entity/commit/5744c51e6b3178bd9f229f3f465b683bb4474c8a))
* separate out EntityMutationValidator ([#68](https://github.com/expo/entity/issues/68)) ([547a1ef](https://github.com/expo/entity/commit/547a1efcecd17cc085702d1a3e9888ce5b644b13))
* update setField to correct typing ([#62](https://github.com/expo/entity/issues/62)) ([7a77afc](https://github.com/expo/entity/commit/7a77afc83ea732c9b062a5d6865eff9d3131d015))


### Features

* entity mutation validators ([#67](https://github.com/expo/entity/issues/67)) ([fc4377d](https://github.com/expo/entity/commit/fc4377d8839da07417b88afc138f73556383d896))
* mutation triggers ([#65](https://github.com/expo/entity/issues/65)) ([fd6060c](https://github.com/expo/entity/commit/fd6060cc844f60635b3ce4c400c4877f2df8fa44))





## [0.5.2](https://github.com/expo/entity/compare/v0.5.1...v0.5.2) (2020-07-02)


### Bug Fixes

* fix stub cache key generation for global cache ([#59](https://github.com/expo/entity/issues/59)) ([7c180e8](https://github.com/expo/entity/commit/7c180e84d9a8cdfd9380fac0eab2d02a96ec18f3))





## [0.5.1](https://github.com/expo/entity/compare/v0.5.0...v0.5.1) (2020-07-01)


### Bug Fixes

* correct some typing issues and exports ([#57](https://github.com/expo/entity/issues/57)) ([e91cfba](https://github.com/expo/entity/commit/e91cfba99321c2c4da2078aafd8627cbf0ceca50))





# 0.5.0 (2020-07-01)


### Bug Fixes

* support number ID field generation in StubDatabaseAdapter ([#43](https://github.com/expo/entity/issues/43)) ([60cc0fb](https://github.com/expo/entity/commit/60cc0fbda460c3ada1f5244a2780f90382fe3ebd))


### Features

* add two fan out methods to association loader ([#52](https://github.com/expo/entity/issues/52)) ([89cfb3d](https://github.com/expo/entity/commit/89cfb3d5a01d4da90f64acc52ae1b839ba348a35))
* support entity fields subset of db fields ([#49](https://github.com/expo/entity/issues/49)) ([4e40b2e](https://github.com/expo/entity/commit/4e40b2e521407e521d236978ec3b3b56db3990be))
