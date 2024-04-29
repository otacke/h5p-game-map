#!/bin/bash

if ! netstat -tln | grep ":8080 " >/dev/null; then
  cd "$H5P_CLI_DIR"

  # H5P CLI server doesn't allow to run in a detached process
  nohup h5p server </dev/null >/dev/null 2>&1 &
  H5P_CLI_SERVER_PID=$!
  export H5P_CLI_SERVER_PID
  echo "Running H5P CLI detached with PID $H5P_CLI_SERVER_PID"
  cd "$H5P_CONTENT_REPOSITORY_DIR"
else
  echo "Could not start H5P CLI server, is it running already?"
fi
