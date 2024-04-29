#!/bin/bash

echo "${COLOR_BLUE}Setting up test content${COLOR_OFF}"

if [ ! -d "$H5P_CONTENT_REPOSITORY_DIR/assets" ]; then
  mkdir assets
fi

if [ ! -f "$H5P_CONTENT_REPOSITORY_DIR/assets/$H5P_CLI_TESTCONTENT.h5p" ]; then
  curl -o "$H5P_CONTENT_REPOSITORY_DIR/assets/$H5P_CLI_TESTCONTENT.h5p" "$H5P_CLI_TESTFILE_URL"
fi

# h5p import must run on the same directory as the content directory
if [ -d "$H5P_CLI_DIR/content/" ]; then
  # Probably okay, but this assumes that this is running inside the H5P CLI server
  cd "$H5P_CLI_DIR"
  if [ ! -d "$H5P_CLI_DIR/content/$H5P_CLI_TESTCONTENT" ]; then
    h5p import "$H5P_CLI_TESTCONTENT" "$REPOSITORY_DIR/$H5P_CLI_TESTCONTENT.h5p"
  fi
  cd "$H5P_CONTENT_REPOSITORY_DIR"
fi
