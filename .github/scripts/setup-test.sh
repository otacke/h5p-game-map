#!/bin/bash

echo -e "${COLOR_BLUE}Setting up test content${COLOR_OFF}"

if [ ! -d "$H5P_CONTENT_REPOSITORY_DIR/assets" ]; then
  mkdir assets
fi

# TODO: Instead of downloading a prebuilt file, ideally the file should be built
# and packed. This would allow to share the test content as params/assets only
# instead of requiring a potentially large binary file that doesn't git well ...
# Ideally, the H5P CLI tool would provide an option to do this.
if [ ! -f "$H5P_CONTENT_REPOSITORY_DIR/assets/$H5P_CLI_TESTCONTENT.h5p" ]; then
  curl -o "$H5P_CONTENT_REPOSITORY_DIR/assets/$H5P_CLI_TESTCONTENT.h5p" "$H5P_CLI_TESTFILE_URL"
fi

# h5p import must run on the same directory as the content directory
if [ -d "$H5P_CLI_DIR/content/" ]; then
  # Probably okay, but this assumes that this is running inside the H5P CLI server
  # TODO: Find a good way to either have switch that allows to use the H5P CLI
  # tool locally if it is running or an extra script that sets up everything
  # from scratch and works like container.
  cd "$H5P_CLI_DIR"
  if [ ! -d "$H5P_CLI_DIR/content/$H5P_CLI_TESTCONTENT" ]; then
    h5p import "$H5P_CLI_TESTCONTENT" "$REPOSITORY_DIR/$H5P_CLI_TESTCONTENT.h5p"
  fi
  cd "$H5P_CONTENT_REPOSITORY_DIR"
fi
