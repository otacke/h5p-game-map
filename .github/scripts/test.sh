#!/bin/bash
SCRIPT_DIR=$(pwd)

. "$SCRIPT_DIR/configure-test.sh" &&
. "$SCRIPT_DIR/setup-github.sh" &&
. "$SCRIPT_DIR/setup-test.sh" &&
. "$SCRIPT_DIR/start-h5p-cli-server.sh" &&
. "$SCRIPT_DIR/run-playwright.sh" &&
. "$SCRIPT_DIR/stop-h5p-cli-server.sh"
