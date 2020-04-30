# @expo/entity

> Note: Documentation is a work-in-progress, but all concepts are documented in source code JSDoc.

## Core Overview

A instance of an entity represents a single "row" (object) of persisted data in a database that a viewer, represented by a ViewerContext, has permission to read.

Authorization of create, read, update, and delete operations for an entity are declaratively defined using an EntityPrivacyPolicy.

Entites are loaded through an EntityLoader, which is responsible for orchestrating fetching, caching, and authorization of entity loads.

Entities are mutated and deleted through an EntityMutator, which is responsible for orchestrating database writes, cache invalidation, and authorization of entity mutations.