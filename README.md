# Entity
> A privacy-first data model framework for TypeScript

[![npm](https://img.shields.io/npm/v/@expo/entity)](https://www.npmjs.com/package/@expo/entity)
![NPM](https://img.shields.io/npm/l/@expo/entity)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

Entity provides a structured, clear, and testable framework to define, cache, and authorize access to application data models.

## Core Features

- Declarative actor authorization using Privacy Policies
- Configurable data storage using Database Adapters
- Configurable, optional full-model caching using Cache Adapters
- Well-typed model declaration and data access

## Getting Started

1. Start by installing the core framework ([Documentation](packages/entity/README.md)):
    ```sh
    yarn add @expo/entity
    ```

1. Add Postgres Database Adapter ([Documentation](packages/entity-database-adapter-knex/README.md)):
    ```sh
    yarn add @expo/entity-database-adapter-knex
    ```

