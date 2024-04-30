#!/bin/bash

echo -e "${COLOR_BLUE}Stopping H5P CLI server${COLOR_OFF}"

if [ -n "$H5P_CLI_SERVER_PID" ]; then
  kill $H5P_CLI_SERVER_PID
  unset $H5P_CLI_SERVER_PID
else
  PROBABLE_ID=$(lsof -i :8080 -sTCP:LISTEN -n -P | grep LISTEN | grep node | grep $(whoami) | awk '{print $2}')

  if [ -n "$PROBABLE_ID" ]; then
    echo -e "${COLOR_RED}... A server seems to have been running before running the test. You should be able to stop it manually yourself or by running 'kill -9 $PROBABLE_ID'${COLOR_OFF}"
  fi
fi
