#!/usr/bin/env bash

previous_content=$(cat src/index.ts)
cat > src/index.ts <<- EOM
/* eslint-disable tsdoc/syntax */
/**
 * @packageDocumentation
 * @module $1
 */

$previous_content
EOM