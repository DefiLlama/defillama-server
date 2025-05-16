import protocols from "../protocols/data";
import parentProtocols from "../protocols/parentProtocols";
import { parse } from "url";
import * as fs from "fs";
import * as dns from "dns";
import { promisify } from "util";
import * as https from "https";
import * as http from "http";

// Extract URLs from protocols
const urls = protocols.concat(parentProtocols as any[]).filter(p=>p.deadUrl !== true).map(p => p.url);

// Promisify DNS functions
const dnsLookup = promisify(dns.lookup);
const dnsResolve = promisify(dns.resolve);

/**
 * Extracts domain from a URL
 */
function extractDomain(url: string): string {
  try {
    // Handle URLs without protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const parsedUrl = parse(url);
    return parsedUrl.hostname || '';
  } catch (error) {
    console.error(`Error extracting domain from ${url}:`, error);
    return '';
  }
}

/**
 * Performs an HTTP request with a timeout
 */
function httpRequest(url: string, timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { timeout }, () => {
      resolve(true); // Got a response, domain is active
    });
    
    req.on('error', () => {
      resolve(false); // Error, might be inactive
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false); // Timeout, might be inactive
    });
  });
}

/**
 * Checks if a domain is likely expired using multiple verification methods
 * Returns a confidence score (0-1) where higher means more likely to be available
 */
async function checkDomainAvailability(domain: string): Promise<number> {
  let score = 0;
  let checks = 0;
  
  // Check 1: DNS lookup
  try {
    await dnsLookup(domain);
    // Domain resolves to an IP, likely active
  } catch (error) {
    // DNS lookup failed, domain might be expired
    score += 1;
  }
  checks++;
  
  // Check 2: DNS records (MX, NS, etc.)
  try {
    // Try to get NS records
    await dnsResolve(domain, 'NS');
    // Has NS records, likely active
  } catch (error) {
    // No NS records, might be expired
    score += 1;
  }
  checks++;
  
  // Check 4: HTTPS request to domain
  const httpsActive = await httpRequest(`https://${domain}`);
  if (!httpsActive) {
    score += 1;
  }
  checks++;
  
  // Calculate confidence score (0-1)
  return score / checks;
}

/**
 * Process domains using a worker pool pattern
 */
async function processDomainPool(domains: string[], concurrency: number, confidenceThreshold: number) {
  const results: { domain: string; confidence: number }[] = [];
  const inProgress = new Set<Promise<void>>();
  const deadDomains: { domain: string; confidence: number }[] = [];
  let activeCount = 0;
  let processedCount = 0;
  
  // Create a queue from the domains array
  const queue = [...domains];
  
  // Process function that will be called for each worker
  const processNext = async (): Promise<void> => {
    if (queue.length === 0) return;
    
    const domain = queue.shift()!;
    try {
      const confidence = await checkDomainAvailability(domain);
      
      processedCount++;
      
      if (confidence >= confidenceThreshold) {
        deadDomains.push({ domain, confidence });
        console.log(`✅ ${domain} is likely dead/available (confidence: ${(confidence * 100).toFixed(1)}%)`);
      } else {
        activeCount++;
      }
      
      // Log progress every 10 domains
      if (processedCount % 10 === 0 || processedCount === domains.length) {
        console.log(`Progress: ${processedCount}/${domains.length} domains checked (${deadDomains.length} potentially dead, ${activeCount} active)`);
      }
      
      results.push({ domain, confidence });
    } catch (error) {
      console.error(`Error processing domain ${domain}:`, error);
      results.push({ domain, confidence: 0 });
      activeCount++;
    }
    
    // Process the next domain if there are any left
    if (queue.length > 0) {
      const newPromise = processNext();
      inProgress.add(newPromise);
      await newPromise;
      inProgress.delete(newPromise);
    }
  };
  
  // Start initial workers up to concurrency limit
  const initialWorkers = Math.min(concurrency, domains.length);
  const initialPromises = Array(initialWorkers)
    .fill(0)
    .map(() => {
      const promise = processNext();
      inProgress.add(promise);
      return promise;
    });
  
  // Wait for all workers to complete
  await Promise.all(initialPromises);
  
  return { results, deadDomains, activeCount };
}

/**
 * Main function to find dead domains
 */
async function findDeadDomains() {
  console.log(`Processing ${urls.length} URLs...`);
  
  // Extract domains from URLs and remove duplicates
  console.time('Domain extraction');
  const uniqueDomains = [...new Set(
    urls
      .map(url => extractDomain(url))
      .filter(domain => domain !== '')
  )];
  console.timeEnd('Domain extraction');
  
  console.log(`Found ${uniqueDomains.length} unique valid domains to check.`);
  console.log(`Checking domains for availability using multiple verification methods...`);
  
  // Use a pool of 50 concurrent workers (reduced to avoid rate limiting)
  const concurrency = 50;
  // Require 75% confidence (3 out of 4 checks must fail) to reduce false positives
  const confidenceThreshold = 1;
  
  console.time('Domain availability checks');
  
  const { deadDomains, activeCount } = await processDomainPool(uniqueDomains, concurrency, confidenceThreshold);
  
  console.timeEnd('Domain availability checks');
  
  // Sort by confidence (highest first)
  deadDomains.sort((a, b) => b.confidence - a.confidence);
  
  // Display summary
  console.log(`\n===== SUMMARY =====`);
  console.log(`Total domains checked: ${uniqueDomains.length}`);
  console.log(`Active domains: ${activeCount}`);
  console.log(`Potentially dead/available domains: ${deadDomains.length}`);
  
  // Display results
  if (deadDomains.length > 0) {
    console.log(`\n===== POTENTIALLY DEAD/AVAILABLE DOMAINS =====`);
    deadDomains.forEach(({ domain, confidence }) => 
      console.log(`- ${domain} (confidence: ${(confidence * 100).toFixed(1)}%)`)
    );
  }
  
  // Save results to file
  if (deadDomains.length > 0) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `dead-domains-${timestamp}.json`;
    
    const output = {
      potentiallyDeadOrAvailable: deadDomains.map(d => ({
        domain: d.domain,
        confidence: parseFloat((d.confidence * 100).toFixed(1))
      })),
      note: "Confidence percentage indicates how likely the domain is to be available. Check with a domain registrar to confirm."
    };
    
    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`\nResults saved to ${filename}`);
    console.log("\nNOTE: These domains failed multiple verification checks, which suggests they might be expired or available.");
    console.log("The confidence percentage indicates how likely the domain is to be available.");
    console.log("For definitive results, check with a domain registrar like Namecheap or GoDaddy.");
  } else {
    console.log("\nNo potentially dead/available domains found.");
  }
}

findDeadDomains().catch(error => {
  console.error("Error running script:", error);
  process.exit(1);
});