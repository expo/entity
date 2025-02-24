# @expo/entity-codemod

A package containing jscodeshift codemods for @expo/entity upgrades.

Codemods are transformations that run on your codebase programmatically. This allows for a large amount of changes to be applied without having to manually go through every file.

## Usage

These should be used via the [jscodeshift CLI](https://github.com/facebook/jscodeshift?tab=readme-ov-file#usage-cli).

For example:

```
yarn add -D @expo/entity-codemod
```

Then, in package.json scripts:

```json
"jscodeshift": "jscodeshift --extensions=ts --parser=ts"
```

And finally:
```sh
yarn jscodeshift src -t node_modules/@expo/entity-codemod/build/v0.39.0-v0.40.0.js
```
