#!/bin/bash

echo -e "${COLOR_BLUE}Running end-to-end tests${COLOR_OFF}"

npx playwright test "$H5P_CONTENT_REPOSITORY_DIR/tests/main.spec.js"
