#!/bin/bash

export H5P_CONTENT_REPOSITORY_DIR=$(pwd)
export H5P_CLI_DIR="$H5P_CONTENT_REPOSITORY_DIR/../.."
export H5P_CLI_TESTFILE_URL="https://h5p.org/sites/default/files/h5p/exports/animals-arround-the-world-game-map-example-1466958.h5p"
export H5P_CLI_TESTCONTENT="testfile"
export H5P_CLI_MACHINE_NAME=$(grep -E '"machineName"\s*:\s*"[^"]+"' library.json | grep -v ': {' | sed 's/.*"\([^"]*\)".*/\1/' | head -n 1)

# Color palette
export COLOR_OFF='\033[0m'
export COLOR_RED='\033[0;31m'
export COLOR_BLUE='\033[0;34m'
