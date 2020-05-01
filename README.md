# Entity

Entity is a privacy-aware data layer for defining, caching, and authorizing access to application data models.

[![npm](https://img.shields.io/npm/v/@expo/entity)](https://www.npmjs.com/package/@expo/entity)
[![NPM](https://img.shields.io/npm/l/@expo/entity)](https://www.npmjs.com/package/@expo/entity)

## Core Features

- Declarative actor authorization using Privacy Policies
- Configurable data storage using Database Adapters
- Configurable, optional full-object caching using Cache Adapters
- [Dataloader](https://github.com/graphql/dataloader) in-memory caching
- Well-typed model declaration and data access

## Getting Started

The best place get started is by checking out the example application.

## Background

Authorization is the process of determining whether a user has access to a piece of data or a feature.

One could imagine a simple application with users and their photos. The authorization logic is simple: when the user loads their photos, only query photos `WHERE user_id = user.id`. A more complex authorization system is most likely overkill at this point.

Now, lets add teams to our simple application, where users on the same team can see each others' photos. The authorization logic becomes more complex: `WHERE user_id = user.id OR user_id IN (list of users for all organizations that user belongs to)`. While still maintainable, one can see that as requirements are added, this logic becomes increasingly difficult to express in just the query or simple checks in code.

A common next step is to add an authorization system on top of the data loading layer. [Pundit](https://github.com/varvet/pundit) and [Django Rules](https://github.com/dfunckt/django-rules) are examples of excellent libraries that provide this functionality. The application code starts to resemble the following, where the data is first loaded and then the authorization is checked:

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

This works well and is flexible since it allows executing ad-hoc authorization checks. Some libraries even provide ways to hook into views such that authorization checks are done automatically. This is sufficient for many applications but still has one main drawback: it is prone to error in cases where the authorization check is forgotten or the incorrect check is performed.

The Entity framework solves this by adding an additional property to the system: all data accesses are authorized by design. Given an `object` and a `viewer`, the framework provides a clear and testable mechanism for expressing complex relationships between `object` and `viewer` needed to determine access during CRUD data operations, and makes it impossible to perform those operations without performing the access checks. This combines the data load and authorization steps from above into a single step:

```typescript
class PhotoPrivacyPolicy {
  const readRules = [
    new AllowIfOwnerRule(),
    new AllowIfOrganizationPermissionRule(),
  ];
}

function get_photo_page(viewer): string {
  const photo = PhotoEntity.loader(viewer).loadById(id);
  return render_html(photo);
}
```

## Use Case

Entity is not limited in where it can or should be used, but was designed for use in a [Koa](https://koajs.com/)-like environment with a request and response. At Expo, we use Entity in the following manner:
1. A request comes into Koa router
1. Middleware initializes the Entity framework for the request
1. A `ViewerContext` is created identifying the individual making the request. The viewer is provided to the request fulfiller through request state.
1. The request fulfiller uses the Entity framework to read some data, and return a response.

Note: The entity framework instance should not be shared across multiple requests since it contains a unique memoized [Dataloader](https://github.com/graphql/dataloader#class-dataloader). A long-lived instance is prone to data synchronization issues, especially when the application is scaled horizontally and multiple shared caches would exist for the same data.

## License

The Entity source code is made available under the [MIT license](LICENSE).