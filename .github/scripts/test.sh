#!/bin/bash
. ./.github/scripts/configure-test.sh &&
. ./.github/scripts/setup-github.sh &&
. ./.github/scripts/setup-test.sh &&
. ./.github/scripts/start-h5p-cli-server.sh &&
. ./.github/scripts/run-playwright.sh &&
. ./.github/scripts/stop-h5p-cli-server.sh
