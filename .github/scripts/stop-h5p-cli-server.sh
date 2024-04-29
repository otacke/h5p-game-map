#!/bin/bash

if [ -n "$H5P_CLI_SERVER_PID" ]; then
  kill $H5P_CLI_SERVER_PID
  unset $H5P_CLI_SERVER_PID
fi
