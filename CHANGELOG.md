# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.13.0](https://github.com/expo/entity/compare/v0.12.0...v0.13.0) (2021-02-12)


### Bug Fixes

* allow undefined value for all fields ([#114](https://github.com/expo/entity/issues/114)) ([022e0e9](https://github.com/expo/entity/commit/022e0e9b88a5e84e0c1bc6c8810c850beb05f0cf))


### Features

* add basic field type runtime validators ([#113](https://github.com/expo/entity/issues/113)) ([6c4d4b0](https://github.com/expo/entity/commit/6c4d4b03b5404dd776a12c5eb6f0af77a8c964f8))





# [0.12.0](https://github.com/expo/entity/compare/v0.11.0...v0.12.0) (2021-01-22)


### Bug Fixes

* move runInTransaction to ViewerContext ([#108](https://github.com/expo/entity/issues/108)) ([b7309e1](https://github.com/expo/entity/commit/b7309e18a2dd780b64cd306d566de1f12bf8df3a))
* remove cache and database adaptor flavor enums ([#109](https://github.com/expo/entity/issues/109)) ([72a77f8](https://github.com/expo/entity/commit/72a77f8b6893a4b76d3b1cce16659bdf3ce473ee))


### Features

* better typing on filterMap for use with predicates ([#106](https://github.com/expo/entity/issues/106)) ([01b3bfe](https://github.com/expo/entity/commit/01b3bfef7c6da55e7d89d8cccb52a0050187aee8))





# [0.11.0](https://github.com/expo/entity/compare/v0.10.0...v0.11.0) (2020-12-24)


### Bug Fixes

* add type generic default in test utils ([#104](https://github.com/expo/entity/issues/104)) ([fe2917e](https://github.com/expo/entity/commit/fe2917e6b5af808f166aa354d476e168c41e6d21))
* maps utils invariants for collections containing undefined values ([#103](https://github.com/expo/entity/issues/103)) ([29c1a43](https://github.com/expo/entity/commit/29c1a434ab6cd8d30e9f0e7c742065c8d46d8d8a))
* remove any cast from EntityLoader ([#100](https://github.com/expo/entity/issues/100)) ([b8e07f9](https://github.com/expo/entity/commit/b8e07f9ddc4077768980c000d61f5ddcc824e2e3))


### Features

* better cache adapter error handling ([#102](https://github.com/expo/entity/issues/102)) ([15546aa](https://github.com/expo/entity/commit/15546aad97734ab9ac67f1c012485f096a0e94f1))
* better database adapter error handling ([#101](https://github.com/expo/entity/issues/101)) ([5208aee](https://github.com/expo/entity/commit/5208aeedb0192f0460ba3d575770a04175f5c3aa))





# [0.10.0](https://github.com/expo/entity/compare/v0.9.1...v0.10.0) (2020-11-17)


### Bug Fixes

* fix null handling in load paths (try 2) ([#96](https://github.com/expo/entity/issues/96)) ([d960329](https://github.com/expo/entity/commit/d9603298e0cc5c3c2b0cca959876e9195555fb57))





## [0.9.1](https://github.com/expo/entity/compare/v0.9.0...v0.9.1) (2020-11-06)


### Bug Fixes

* edge deletion behavior cyclic import structure again ([#93](https://github.com/expo/entity/issues/93)) ([012c05d](https://github.com/expo/entity/commit/012c05d62d2ecd559eb331c6ca358052bfe66dc8))





# [0.9.0](https://github.com/expo/entity/compare/v0.8.1...v0.9.0) (2020-11-05)


### Bug Fixes

* edge deletion behavior cyclic import structure ([#89](https://github.com/expo/entity/issues/89)) ([cca8fc1](https://github.com/expo/entity/commit/cca8fc19870057ebc7033081b59fab4a142fbf1a))


### Features

* add ability to invalidate an entity manually ([#91](https://github.com/expo/entity/issues/91)) ([d1a6f13](https://github.com/expo/entity/commit/d1a6f1339648942f12b3fb605eb329aefe5cdd63))





## [0.8.1](https://github.com/expo/entity/compare/v0.8.0...v0.8.1) (2020-10-09)

**Note:** Version bump only for package root





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
* upgrade Apollo server for security advisory ([#38](https://github.com/expo/entity/issues/38)) ([d25c1e1](https://github.com/expo/entity/commit/d25c1e142d52385725593f4f155d1795697ab490))


### Features

* add two fan out methods to association loader ([#52](https://github.com/expo/entity/issues/52)) ([89cfb3d](https://github.com/expo/entity/commit/89cfb3d5a01d4da90f64acc52ae1b839ba348a35))
* support entity fields subset of db fields ([#49](https://github.com/expo/entity/issues/49)) ([4e40b2e](https://github.com/expo/entity/commit/4e40b2e521407e521d236978ec3b3b56db3990be))


# 0.4.0 (2020-06-03)


* All Packages
  * Documentation Improvements
  * CI & Coverage
  * TypeScript 3.9 ([#18](https://github.com/expo/entity/pull/18))
* `@expo/entity`
  * Enforcing mutator convenience functions ([#5](https://github.com/expo/entity/pull/5))
  * `loadByIDNullable` loader method ([#28](https://github.com/expo/entity/pull/28))
  * Add ability to check update and delete policies outside of mutation ([#30](https://github.com/expo/entity/pull/30))
* `@expo/entity-cache-adapter-redis`
* `@expo/entity-database-adapter-knex`
  * Throw when database adapter receives unexpected mutation results ([#31](https://github.com/expo/entity/pull/31))
* `@expo/entity-example`
  * Initial Version

# 0.3.0 (2020-04-28)

* `@expo/entity`
  * Initial Version
* `@expo/entity-cache-adapter-redis`
  * Initial Version
* `@expo/entity-database-adapter-knex`
  * Initial Version
