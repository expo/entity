# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
