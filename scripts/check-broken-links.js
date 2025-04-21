#!/usr/bin/env node

const { SiteChecker, HtmlUrlChecker } = require("broken-link-checker");
const chalk = require("chalk");

// Parse arguments
const args = process.argv.slice(2);
const siteUrl = args[0] || "https://www.pulumi.com";
const maxPages = parseInt(args[1]) || 0; // 0 means no limit
const checkMode = args[2] || "site"; // "site" or "page"

// Track broken links
const brokenLinks = [];
let pagesChecked = 0;

// Define exclusions
const excludePatterns = [
    // Social media that often causes 403s or requires authentication
    "twitter.com",
    "linkedin.com",
    "facebook.com",
    "instagram.com",
    
    // Common exclusions from the existing script
    "/docs/reference/pkg",
    "/registry/packages/*/api-docs",
    "/logos/pkg",
    "/docs/get-started/install/versions",
    "https://api.pulumi.com/",
    "https://github.com/pulls?",
    "https://github.com/pulumi/docs/edit/master",
    "https://github.com/pulumi/docs/issues/new",
    "https://github.com/pulumi/registry/edit/master",
    "https://github.com/pulumi/registry/issues/new",
    "github.com",
    "example.com"
];

// Options for the checker
const options = {
    excludedKeywords: excludePatterns,
    filterLevel: 1, // Only check same-site links (0=all, 1=same domain, 2=same host, 3=same path)
    honorRobotExclusions: true,
    maxSocketsPerHost: 5,
    userAgent: "pulumi-link-checker/1.0",
    maxDepth: checkMode === "site" ? 2 : 0, // Limit depth for site mode to avoid timeout
    requestMethod: "GET"
};

console.log(chalk.blue(`Starting link checker for ${siteUrl} in ${checkMode} mode`));
console.log(chalk.blue(`${maxPages > 0 ? 'Checking up to ' + maxPages + ' pages' : 'No page limit'}`));
console.log(chalk.blue("This may take several minutes..."));

// Handler functions
const handlers = {
    link: (result) => {
        if (result.broken) {
            const { url, brokenReason } = result;
            const { base } = result;
            
            // Skip certain HTTP codes that may be false positives
            if (brokenReason === "HTTP_999" || // LinkedIn rate limiting
                brokenReason === "HTTP_429" || // Rate limiting
                brokenReason === "HTTP_5XX") { // Server errors that might be temporary
                return;
            }
            
            // Add to broken links array
            brokenLinks.push({
                source: base.original,
                destination: url.resolved,
                reason: brokenReason
            });
            
            // Output to console
            console.log(chalk.red(`Broken link: ${url.resolved}`));
            console.log(chalk.yellow(`  from: ${base.original}`));
            console.log(chalk.yellow(`  reason: ${brokenReason}`));
            console.log();
        }
    },
    
    page: (error, pageUrl) => {
        pagesChecked++;
        
        if (error) {
            console.log(chalk.red(`Error scanning page ${pageUrl}: ${error.message}`));
        } else {
            console.log(chalk.blue(`Scanned page (${pagesChecked}): ${pageUrl}`));
        }
        
        // Check if we've reached the max pages limit
        if (maxPages > 0 && pagesChecked >= maxPages) {
            console.log(chalk.yellow(`Reached limit of ${maxPages} pages, stopping scan.`));
            checker.pause();
            
            // Display final results
            displayResults();
        }
    },
    
    end: () => {
        displayResults();
    },
    
    error: (error) => {
        console.error(chalk.red(`Error: ${error.message}`));
    }
};

function displayResults() {
    console.log(chalk.blue(`Link checking complete! Scanned ${pagesChecked} pages.`));
    
    if (brokenLinks.length === 0) {
        console.log(chalk.green("No broken links found!"));
    } else {
        console.log(chalk.red(`Found ${brokenLinks.length} broken links:`));
        
        // Group by source page
        const groupedLinks = {};
        brokenLinks.forEach(link => {
            if (!groupedLinks[link.source]) {
                groupedLinks[link.source] = [];
            }
            groupedLinks[link.source].push({
                destination: link.destination,
                reason: link.reason
            });
        });
        
        // Output summary by page
        Object.keys(groupedLinks).forEach(source => {
            console.log(chalk.yellow(`\nSource page: ${source}`));
            groupedLinks[source].forEach(link => {
                console.log(chalk.red(`  → ${link.destination}`));
                console.log(chalk.gray(`    Reason: ${link.reason}`));
            });
        });
        
        // Exit with non-zero code if broken links were found
        process.exit(1);
    }
}

// Initialize the appropriate checker
let checker;
if (checkMode === "site") {
    checker = new SiteChecker(options, handlers);
    checker.enqueue(siteUrl);
} else {
    checker = new HtmlUrlChecker(options, handlers);
    checker.enqueue(siteUrl);
}