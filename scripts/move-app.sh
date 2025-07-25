#!/bin/bash

# Move all contents from app/ to src/app/
cp -r app/* src/app/

# Remove the old app directory
rm -rf app/ 