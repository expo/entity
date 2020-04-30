#!/usr/bin/env bash

export NODE_ENV=test

export REDIS_PORT="16379"
export REDIS_URL="redis://localhost:${REDIS_PORT}/0"

export PGUSER="postgresuser"
export PGPASSWORD="handkerchief-break-popular-population"
export PGDATABASE="test"
export PGPORT="25432"