#!/usr/bin/env bash

set -euo pipefail

for dir in packages/*
do
    if [[ "$dir" =~ (full-integration-tests|entity-example|entity-codemod) ]]; then
        continue
    fi
    name=$(jq --raw-output .name "$dir/package.json")
    index="$dir/src/index.ts"
    if [ -f "$index" ]; then
      previous_content=$(cat "$index")
      cat > "$index" <<- EOM
/* eslint-disable tsdoc/syntax */
/**
 * @packageDocumentation
 * @module $name
 */

$previous_content
EOM
    fi
done
