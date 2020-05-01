# @expo/entity-example
> Example usage of @expo/entity.

## Summary

This is a simple API server application built with [Koa](https://koajs.com/). The application allows users to create, read, update, and delete notes, and the notes are publicly visible.

For demonstration purposes, the application stores its data in-memory, and the memory is cleared when the application is terminated. In a production application, data would be persisted to and cached in stable storage (Postgres and Redis).

In this demonstration, all tests are able to be run as unit tests, but in a production application the router test would most likely need to be an integration test. That being said, any entity-related business logic can be unit tested as is demonstrated in the NoteEntity-test.