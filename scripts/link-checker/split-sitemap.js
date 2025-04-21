#!/usr/bin/env node

/**
 * Sitemap Splitter
 * 
 * This script splits a large sitemap.xml file into multiple smaller sitemaps 
 * organized by content section (e.g., docs, blog, tutorials).
 * 
 * It also generates a sitemap index file that references all the split sitemaps.
 */

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const zlib = require('zlib');

// Configuration
const INPUT_SITEMAP = path.join(__dirname, '../../sitemap.xml');
const OUTPUT_DIR = path.join(__dirname, '../../static/sitemaps');
const DOMAIN = 'https://www.pulumi.com';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read the input sitemap
const sitemapXml = fs.readFileSync(INPUT_SITEMAP, 'utf8');

// Parse the XML
const parser = new xml2js.Parser();
parser.parseString(sitemapXml, (err, result) => {
  if (err) {
    console.error('Error parsing sitemap XML:', err);
    process.exit(1);
  }

  if (!result.urlset || !result.urlset.url) {
    console.error('Invalid sitemap format');
    process.exit(1);
  }

  const urls = result.urlset.url;
  console.log(`Found ${urls.length} URLs in sitemap`);

  // Group URLs by section
  const sections = {};
  
  // Define major sections with their URL patterns
  const sectionPatterns = [
    { name: 'docs', pattern: '/docs/' },
    { name: 'blog', pattern: '/blog/' },
    { name: 'tutorials', pattern: '/tutorials/' },
    { name: 'templates', pattern: '/templates/' },
    { name: 'registry', pattern: '/registry/' },
    { name: 'case-studies', pattern: '/case-studies/' },
    { name: 'product', pattern: '/product/' },
    { name: 'compliance', pattern: '/compliance/' },
    { name: 'what-is', pattern: '/what-is/' },
  ];
  
  // Initialize sections
  sectionPatterns.forEach(section => {
    sections[section.name] = [];
  });
  sections.other = []; // For URLs that don't match any defined section
  
  // Group URLs into sections
  urls.forEach(url => {
    const urlLoc = url.loc[0];
    let matched = false;
    
    for (const section of sectionPatterns) {
      if (urlLoc.includes(section.pattern)) {
        sections[section.name].push(url);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      sections.other.push(url);
    }
  });
  
  // Print statistics
  console.log('URL counts by section:');
  Object.keys(sections).forEach(section => {
    console.log(`  ${section}: ${sections[section].length}`);
  });
  
  // Create individual sitemaps for each section
  const sitemapIndex = {
    sitemapindex: {
      $: { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' },
      sitemap: []
    }
  };
  
  const today = new Date().toISOString().split('T')[0];
  
  // Write XSL file for human-readable viewing
  const xslTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>Pulumi XML Sitemap</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            color: #333;
            margin: 0;
            padding: 20px;
          }
          h1 {
            color: #3F51B5;
            font-size: 24px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
          }
          th {
            text-align: left;
            padding: 10px;
            border-bottom: 1px solid #ddd;
            background-color: #f5f5f5;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #eee;
          }
          .url {
            width: 70%;
            word-break: break-all;
          }
          .lastmod, .changefreq, .priority {
            width: 10%;
          }
          a {
            color: #3F51B5;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <h1>Pulumi XML Sitemap</h1>
        <xsl:choose>
          <xsl:when test="//sitemap:url">
            <p>This sitemap contains <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs.</p>
            <table>
              <tr>
                <th class="url">URL</th>
                <th class="lastmod">Last Modified</th>
                <th class="changefreq">Change Frequency</th>
                <th class="priority">Priority</th>
              </tr>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td class="url"><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                  <td class="lastmod"><xsl:value-of select="sitemap:lastmod"/></td>
                  <td class="changefreq"><xsl:value-of select="sitemap:changefreq"/></td>
                  <td class="priority"><xsl:value-of select="sitemap:priority"/></td>
                </tr>
              </xsl:for-each>
            </table>
          </xsl:when>
          <xsl:otherwise>
            <p>This sitemap index contains <xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/> sitemaps.</p>
            <table>
              <tr>
                <th class="url">Sitemap</th>
                <th class="lastmod">Last Modified</th>
              </tr>
              <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                <tr>
                  <td class="url"><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                  <td class="lastmod"><xsl:value-of select="sitemap:lastmod"/></td>
                </tr>
              </xsl:for-each>
            </table>
          </xsl:otherwise>
        </xsl:choose>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xsl'), xslTemplate);
  
  // Process each section
  Object.keys(sections).forEach(section => {
    if (sections[section].length === 0) {
      return; // Skip empty sections
    }
    
    const sectionUrls = sections[section];
    const sitemapFilename = `sitemap-${section}.xml`;
    const sitemapGzFilename = `${sitemapFilename}.gz`;
    const sitemapPath = path.join(OUTPUT_DIR, sitemapFilename);
    const sitemapGzPath = path.join(OUTPUT_DIR, sitemapGzFilename);
    
    // Create XML for this section
    const sectionSitemap = {
      urlset: {
        $: { 
          xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9',
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xsi:schemaLocation': 'http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd'
        },
        url: sectionUrls
      }
    };
    
    // Add XSL stylesheet reference
    const xslInstruction = { 
      _: 'text/xsl',
      $: { href: '/sitemaps/sitemap.xsl', type: 'text/xsl' }
    };
    
    // Add the XML declaration and XSL stylesheet
    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: true, indent: '  ', newline: '\n' },
      allowSurrogateChars: true
    });
    
    let sitemapXmlContent = builder.buildObject(sectionSitemap);
    sitemapXmlContent = sitemapXmlContent.replace(
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemaps/sitemap.xsl"?>'
    );
    
    // Write the sitemap file
    fs.writeFileSync(sitemapPath, sitemapXmlContent);
    
    // Create gzipped version
    const compressed = zlib.gzipSync(sitemapXmlContent);
    fs.writeFileSync(sitemapGzPath, compressed);
    
    console.log(`Created sitemap for ${section}: ${sitemapFilename} (${sectionUrls.length} URLs)`);
    
    // Add to sitemap index
    sitemapIndex.sitemapindex.sitemap.push({
      loc: [`${DOMAIN}/sitemaps/${sitemapFilename}`],
      lastmod: [today]
    });
  });
  
  // Add XSL stylesheet reference to sitemap index
  const indexBuilder = new xml2js.Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' },
    renderOpts: { pretty: true, indent: '  ', newline: '\n' },
    allowSurrogateChars: true
  });
  
  let sitemapIndexXml = indexBuilder.buildObject(sitemapIndex);
  sitemapIndexXml = sitemapIndexXml.replace(
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemaps/sitemap.xsl"?>'
  );
  
  // Write sitemap index
  const indexPath = path.join(OUTPUT_DIR, 'sitemap-index.xml');
  fs.writeFileSync(indexPath, sitemapIndexXml);
  
  // Create gzipped version of the index
  const compressedIndex = zlib.gzipSync(sitemapIndexXml);
  fs.writeFileSync(`${indexPath}.gz`, compressedIndex);
  
  console.log(`Created sitemap index at ${indexPath}`);
  
  // Create a root sitemap.xml in the static directory that references the index
  const rootSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${DOMAIN}/sitemaps/sitemap-index.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
  
  fs.writeFileSync(path.join(__dirname, '../../static/sitemap.xml'), rootSitemap);
  console.log('Created root sitemap.xml that points to the index');
  
  console.log('Sitemap splitting complete!');
});