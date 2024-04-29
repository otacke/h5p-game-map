#!/bin/bash

echo "${COLOR_BLUE}Starting H5P CLI server${COLOR_OFF}"

if ! netstat -tln | grep ":8080 " >/dev/null; then
  cd "$H5P_CLI_DIR"

  # H5P CLI server doesn't allow to run in a detached process, unfortunately.
  # Workaround is to force it detached and keep the process ID to kill the
  # server later.
  nohup h5p server </dev/null >/dev/null 2>&1 &
  H5P_CLI_SERVER_PID=$!
  export H5P_CLI_SERVER_PID

  echo "${COLOR_BLUE}...Started H5P CLI server detached with PID $H5P_CLI_SERVER_PID${COLOR_OFF}"
  cd "$H5P_CONTENT_REPOSITORY_DIR"
else
  echo "${COLOR_RED}...Could not start H5P CLI server, is it running already? Will assume it is.${COLOR_OFF}"
fi
