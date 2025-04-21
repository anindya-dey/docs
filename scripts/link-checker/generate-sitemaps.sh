#!/bin/bash
set -e

# This script is used to generate optimized sitemaps after the site is built.
# It should be run after Hugo generates the initial sitemap.xml file.

cd "$(dirname "$0")/../.."

# Ensure required dependencies are installed
npm install xml2js --no-save --legacy-peer-deps

# Create sitemaps directory if it doesn't exist
mkdir -p static/sitemaps

# Split the sitemap into smaller files by section
echo "Splitting sitemap into section-specific files..."
node scripts/link-checker/split-sitemap.js

# Set proper permissions for the sitemap files
echo "Setting file permissions..."
find static/sitemaps -type f -name "*.xml" -exec chmod 644 {} \;
find static/sitemaps -type f -name "*.gz" -exec chmod 644 {} \;

# Add appropriate MIME types and caching headers to the nginx or .htaccess config
echo "Sitemap generation complete!"
echo ""
echo "IMPORTANT: For proper serving of the sitemaps, ensure your web server is configured with:"
echo "- MIME type application/xml for .xml files"
echo "- MIME type application/x-gzip for .gz files"
echo "- HTTP headers for gzip content encoding on .gz files"
echo ""
echo "For Nginx: Add to your server block:"
echo "  location ~ sitemap.*\.xml {
    gzip_static on;
    add_header Cache-Control \"max-age=86400\";
}"
echo ""
echo "For Apache: Add to your .htaccess:"
echo "  <IfModule mod_mime.c>
    AddType application/xml .xml
    AddType application/x-gzip .gz
</IfModule>
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTP:Accept-Encoding} gzip
    RewriteCond %{REQUEST_FILENAME}.gz -f
    RewriteRule ^(.*)$ $1.gz [L]
</IfModule>
<IfModule mod_headers.c>
    <FilesMatch \"\\.xml\\.gz$\">
        Header set Content-Encoding \"gzip\"
        Header set Content-Type \"application/xml\"
        Header set Cache-Control \"max-age=86400\"
    </FilesMatch>
</IfModule>"