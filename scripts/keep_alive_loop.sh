#!/bin/bash

# Absolute path to the keep_alive.sh script
KEEP_ALIVE_SCRIPT="/home/user/studio/scripts/keep_alive.sh"

# Loop forever
while true; do
    bash "$KEEP_ALIVE_SCRIPT"
    sleep 840  # 14 minutes (14 * 60 seconds)
done

