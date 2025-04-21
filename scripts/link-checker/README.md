# Link Checking Tools

This directory contains tools for checking broken links on the Pulumi website.

## Available Tools

### 1. Original Checker (`check-links.sh`)

The original link checker that performs a comprehensive scan of the entire website. This tool is integrated with the CI/CD pipeline and can post results to Slack.

**Usage:**
```bash
make check_links
```

**Notes:**
- May time out on local machines due to the large number of URLs to check
- Best used in CI environments where it has more time to run

### 2. Efficient Checker (`check-broken-links.sh`)

An improved link checker that can be configured to scan a limited number of pages to avoid timeouts.

**Usage:**

```bash
# Check 20 pages of the site (default)
make check_broken_links

# Check a specific page
make check_page_links PAGE="/docs/get-started/"

# Advanced usage with custom parameters
./scripts/check-broken-links.sh "https://www.pulumi.com" 10 "site"
```

**Parameters:**
- URL: The base URL to check (default: "https://www.pulumi.com")
- MAX_PAGES: Maximum number of pages to check (default: varies by command)
- MODE: "site" (crawl the site) or "page" (check a single page)
- PAGE: The specific page path to check (when using check_page_links)

**Features:**
- Configurable depth and page limits to prevent timeouts
- Exclusion of common false positives like social media links
- Filtering by domain to focus on internal links
- Clear reporting of broken links grouped by source page

## Best Practices

1. **For quick checks of specific pages or sections:**
   ```bash
   make check_page_links PAGE="/path/to/check/"
   ```

2. **For regular site-wide checks with reasonable timeout:**
   ```bash
   make check_broken_links
   ```

3. **For comprehensive pre-deployment validation:**
   ```bash
   make check_links  # in CI environment
   ```

4. **Common issues to ignore:**
   - Twitter/social media links often return HTTP 403 (excluded by default)
   - External sites with rate limiting may return temporary errors
   - HTTP 308 redirects are usually not problematic