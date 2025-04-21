#!/bin/bash
set -e

cd "$(dirname "$0")/.."

# Make sure the script is executable
chmod +x ./scripts/check-broken-links.js

# Default values
URL=${1:-"https://www.pulumi.com"}
MAX_PAGES=${2:-10}
MODE=${3:-"site"}
CHECK_SITEMAP=${5:-"false"}

# If a specific page path is provided, update the URL and mode
if [ -n "$4" ]; then
    URL="${URL}${4}"
    MODE="page"
fi

echo "Running link checker with the following settings:"
echo "  URL: $URL"
echo "  Max Pages: $MAX_PAGES"
echo "  Mode: $MODE"
echo "  Check Sitemap: $CHECK_SITEMAP"
echo ""

# If checking sitemap URLs, first validate them
if [ "$CHECK_SITEMAP" = "true" ]; then
    echo "Validating sitemap URLs first..."
    if [[ "$URL" == *"staging"* ]]; then
        ./scripts/validate-sitemap-urls.sh staging
    else
        ./scripts/validate-sitemap-urls.sh production
    fi
    echo "Sitemap validation complete!"
    echo ""
fi

node ./scripts/check-broken-links.js "$URL" "$MAX_PAGES" "$MODE"