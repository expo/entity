# Entity

Entity is a privacy-aware data layer for defining, caching, and authorizing access to application data models.

[![tests](https://github.com/expo/entity/workflows/tests/badge.svg)](https://github.com/expo/entity/actions?query=workflow%3Atests)
[![docs](https://github.com/expo/entity/workflows/docs/badge.svg)](https://expo.github.io/entity/)
[![codecov](https://codecov.io/gh/expo/entity/graph/badge.svg?token=4cFAAdINbk)](https://codecov.io/gh/expo/entity)
[![npm](https://img.shields.io/npm/v/@expo/entity)](https://www.npmjs.com/package/@expo/entity)
[![NPM](https://img.shields.io/npm/l/@expo/entity)](https://www.npmjs.com/package/@expo/entity)

## Core Features

- Declarative actor authorization using Privacy Policies
- Configurable data storage using Database Adapters
- Configurable, optional full-object caching using Cache Adapters
- [Dataloader](https://github.com/graphql/dataloader) in-memory caching
- Well-typed model declaration

## Getting Started

- [Example application](https://github.com/expo/entity/tree/main/packages/entity-example)
- [Documentation](https://expo.github.io/entity/)


## Background

Authorization is the process of determining whether a user has access to a piece of data or a feature.

One could imagine a simple application with users and their photos. The authorization logic is simple: when the user loads their photos, only query photos `WHERE user_id = user.id`. A more complex authorization system is most likely overkill at this point.

Now, lets add teams to our simple application, where users on the same team can see each others' photos. The authorization logic becomes more complex: `WHERE user_id = user.id OR user_id IN (list of users for all organizations that user belongs to)`. While still maintainable, one can see that as requirements are added, this logic becomes increasingly difficult to express in just the query or simple checks in code.

A common next step is to add an authorization system on top of the data loading layer. [Pundit](https://github.com/varvet/pundit), [Django Rules](https://github.com/dfunckt/django-rules), and [Laravel Policies](https://laravel.com/docs/authorization) are examples of excellent libraries that provide a method to authorize a piece of loaded data in the following manner:

```
PhotoModel
    def authorize_read():
        if rules.is_photo_owner(user, photo)
            return true
        if rules.has_organization_permission(user, photo)
            return true
    def authorize_create():
        ...

PhotoView
    def render():
        photo = Photo.find(params[:id])
        authorize(photo, 'read')
        render_html(photo)
```

This works well and is flexible since it allows executing ad-hoc authorization checks. Most libraries also provide hooks into views or controllers such that these authorization checks are performed automatically. This is sufficient for many applications but still has one main drawback: it is prone to error in cases where the authorization check is forgotten or the incorrect check is performed.

The Entity framework solves this by adding an additional property to the system: all data accesses are authorized. Given an `object` and a `viewer`, the framework provides a clear and testable mechanism for expressing complex relationships between `object` and `viewer` needed to authorize access during CRUD operations, and makes it impossible to perform CRUD operations without performing the authorization checks. This combines the data load and authorization steps from above into a single step:

```typescript
class PhotoPrivacyPolicy {
  const readRules = [
    new AllowIfOwnerRule(),
    new AllowIfOrganizationPermissionRule(),
  ];
}

// in the view, for example
async function get_photo_page(viewer: ViewerContext): string {
  const photo = await PhotoEntity.loader(viewer).loadById(id);
  return render_html(photo);
}
```

## Use Case

Entity is not limited in where it can or should be used, but was designed for use in a [Koa](https://koajs.com/)-like environment with a request and response. At Expo, we use Entity in the following manner:
1. A request comes into Koa router
1. Middleware initializes the Entity framework for the request
1. A `ViewerContext` is created identifying the individual making the request.
1. The request fulfiller uses the Entity framework and the `ViewerContext` to load or mutate some data and return a response.

Note: The entity framework instance should not be shared across multiple requests since it contains a unique memoized [Dataloader](https://github.com/graphql/dataloader#class-dataloader). A long-lived instance is prone to data synchronization issues, especially when the application is scaled horizontally and multiple shared caches would exist for the same data.

## Releasing

To release a new version:
1. `git checkout main`
1. `yarn lerna publish [patch|minor|major] -- --conventional-commits`
1. In GitHub release interface, create a new release from the tag, copy changelog changes to release description.

## License

The Entity source code is made available under the [MIT license](LICENSE).
