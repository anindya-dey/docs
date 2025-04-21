#!/bin/bash
set -e

# Define environments
PRODUCTION_DOMAIN="www.pulumi.com"
STAGING_DOMAIN="www-reg-staging.pulumi-dev.io"

# Determine environment based on command-line argument or default to production
ENVIRONMENT=${1:-"production"}
TARGET_DOMAIN=${ENVIRONMENT}

if [ "$ENVIRONMENT" == "production" ]; then
    TARGET_DOMAIN=$PRODUCTION_DOMAIN
elif [ "$ENVIRONMENT" == "staging" ]; then
    TARGET_DOMAIN=$STAGING_DOMAIN
fi

echo "Validating sitemap URLs for environment: $ENVIRONMENT (domain: $TARGET_DOMAIN)"

request_and_format_sitemap() {
    echo "Downloading sitemap from https://$TARGET_DOMAIN/sitemap.xml"
    curl -s "https://$TARGET_DOMAIN/sitemap.xml" > sitemap.xml && xmllint --format sitemap.xml > temp_sitemap.xml && mv temp_sitemap.xml sitemap.xml
    echo "Sitemap downloaded and formatted"
}

parse_urls() {
    echo "Extracting URLs from sitemap"
    cat sitemap.xml | grep -e loc | sed 's|<loc>\(.*\)<\/loc>$|\1|g' > site_urls.txt
    echo "Found $(wc -l < site_urls.txt) URLs in sitemap"
}

request_urls() {
    echo "Checking URL response codes (this may take a while)..."
    cat site_urls.txt | xargs -I {} curl -L -s -o /dev/null -w "%{http_code} %{url_effective}\n" {} | grep -v '200\|301' || echo "All URLs return valid response codes!"
}

request_and_format_sitemap
parse_urls
request_urls

echo "Sitemap validation complete!"
