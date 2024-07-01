# `@expo/entity`

[Documentation](https://expo.github.io/entity/modules/_expo_entity.html)

## Core Overview

A instance of an entity represents a single "row" (object) of persisted data in a database that a viewer, represented by a ViewerContext, has permission to read.

Authorization of create, read, update, and delete operations for an entity are declaratively defined using an EntityPrivacyPolicy.

Entites are loaded through an EntityLoader, which is responsible for orchestrating fetching, caching, and authorization of entity loads.

Entities are mutated and deleted through an EntityMutator, which is responsible for orchestrating database writes, cache invalidation, and authorization of entity mutations.