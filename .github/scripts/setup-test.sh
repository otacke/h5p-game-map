#!/bin/bash

echo -e "${COLOR_BLUE}Setting up test content${COLOR_OFF}"

if [ ! -d "$H5P_CONTENT_REPOSITORY_DIR/tests" ]; then
  mkdir tests
fi

if [ ! -d "$H5P_CONTENT_REPOSITORY_DIR/tests/assets" ]; then
  mkdir tests/assets
fi

fixtures_directory="$H5P_CONTENT_REPOSITORY_DIR/tests/fixtures"

# Build h5p test files from assets
for folder in "$fixtures_directory"/test-[0-9]*; do
    if [ -d "$folder" ]; then
        content_dir="$folder/content"
        json_file="$folder/h5p.json"
        output_file="$folder/testfile.h5p"

        if [ -d "$content_dir" ] && [ -f "$json_file" ]; then
            rm -f "$output_file"
            (cd "$folder" && zip -rXD "testfile.h5p" "content" "h5p.json")
        fi
    fi
done

cd "$H5P_CONTENT_REPOSITORY_DIR"

# h5p import must run on the same directory as the content directory
if [ -d "$H5P_CLI_DIR/content/" ]; then
  # Probably okay, but this assumes that this is running inside the H5P CLI server
  # TODO: Find a good way to either have switch that allows to use the H5P CLI
  # tool locally if it is running or an extra script that sets up everything
  # from scratch and works like a container.
  cd "$H5P_CLI_DIR"

  for folder in "$fixtures_directory"/test-[0-9]*; do
      if [ -d "$folder" ]; then
          h5p_file="$folder/testfile.h5p"

          if [ -d "$content_dir" ] && [ -f "$h5p_file" ]; then
              folder_name="$(basename "$folder")"

              rm -rf "$H5P_CLI_DIR/content/$folder_name"
              h5p import "$folder_name" "$h5p_file"
          fi
      fi
  done

  cd "$H5P_CONTENT_REPOSITORY_DIR"
fi
