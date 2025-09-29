#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -o errexit

echo "--- Installing dependencies with npm ---"
npm install

echo "--- Installing Puppeteer browser (Chrome) ---"
npx puppeteer browsers install chrome

echo "--- Custom build script finished ---"
