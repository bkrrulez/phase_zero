#!/bin/bash

# URL to ping
URL="https://timetool.onrender.com/"

# Send a simple GET request silently
curl -s "$URL" > /dev/null

# Log the time the request was made
echo "$(date): Pinged $URL" >> /home/user/studio/scripts/keep_alive.log

