#!/bin/bash

# Get the repository URL from package.json
REPO_URL=$(node -e "console.log(require('./package.json').repository.url.replace(/\.git$/, ''))")

# Fetch all tags
git fetch --all --tags

# Get the last tag
LAST_TAG=$(git describe --tags --abbrev=0)

# Generate and store changelog
CHANGELOG=$(git log ${LAST_TAG}..HEAD --pretty=format:"- %s" | \
  sed -E "s|#([0-9]+)|[#\1](${REPO_URL}/pull/\1)|g")

# Print to terminal
echo "Changelog since ${LAST_TAG}:"
echo "$CHANGELOG"
echo

# Copy to clipboard
echo "$CHANGELOG" | pbcopy

echo "Changelog has been copied to clipboard!"
