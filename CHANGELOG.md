# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
