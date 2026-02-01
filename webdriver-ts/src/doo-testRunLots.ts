import yargs from "yargs";
import { checkElementExists, clickElement, startBrowser } from "./puppeteerAccess.js";
import { FrameworkData, initializeFrameworks, BenchmarkOptions, wait } from "./common.js";
import { Page } from "puppeteer-core";
import * as fs from "fs";

let args: any = yargs(process.argv)
  .usage("$0 [--framework Framework1] [--chromeBinary path] [--yalc] [--batches N]")
  .help("help")
  .boolean("headless")
  .default("headless", false)
  .boolean("yalc")
  .default("yalc", false)
  .number("batches")
  .default("batches", 3)
  .array("framework")
  .string("chromeBinary").argv;

console.log("args", args);

let benchmarkOptions: BenchmarkOptions = {
  port: 8080,
  host: "localhost",
  browser: args.browser || "chrome",
  remoteDebuggingPort: 9999,
  chromePort: 9998,
  headless: args.headless,
  chromeBinaryPath: args.chromeBinary,
  numIterationsForCPUBenchmarks: 1,
  numIterationsForMemBenchmarks: 1,
  numIterationsForStartupBenchmark: 1,
  numIterationsForSizeBenchmark: 1,
  batchSize: 1,
  resultsDirectory: "results",
  tracesDirectory: "traces",
  allowThrottling: false,
};

let allArgs = args._.length <= 2 ? [] : args._.slice(2);

async function testRunLots(framework: FrameworkData, page: Page, useYalc: boolean): Promise<number> {
  console.log(`Testing runLots for ${framework.fullNameWithKeyedAndVersion}`);
  
  let url: string;
  if (useYalc) {
    // When using yalc, the framework might be in node_modules
    // Adjust the URL based on how yalc links the package
    url = `http://${benchmarkOptions.host}:${benchmarkOptions.port}/${framework.uri}/index.html`;
  } else {
    url = `http://${benchmarkOptions.host}:${benchmarkOptions.port}/${framework.uri}/index.html`;
  }
  
  // Navigate to the framework page
  try {
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
  } catch (error) {
    console.log(`Warning: networkidle0 timeout, trying with domcontentloaded`);
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
  }

  // Wait for the page to be ready
  await checkElementExists(page, "#runlots");

  // Wait for Timer to be exposed (modules load asynchronously)
  const timerAvailable = await page.waitForFunction(() => {
    return !!(window as any).Timer;
  }, { timeout: 5000 }).catch(() => {
    return false;
  });
  
  if (!timerAvailable) {
    throw new Error("Timer not available on this framework - it may not use the Timer module");
  }

  // Get version from the page
  const version = await page.evaluate(() => {
    const verElement = document.querySelector(".ver");
    if (verElement) {
      const text = verElement.textContent || "";
      // Extract version from text like "v0.98.8-prov-tc (keyed)"
      const match = text.match(/(v[\d.]+[^\s]*)/);
      return match ? match[1] : "";
    }
    return "";
  });

  console.log(`Version: ${version}`);

  // Set up console message listener
  page.on("console", (msg) => {
    console.log("BROWSER:", msg.text());
  });

  // Handle page errors (including CORS)
  page.on("pageerror", (error) => {
    console.log("PAGE ERROR:", error instanceof Error ? error.message : String(error));
  });

  page.on("requestfailed", (request) => {
    console.log("REQUEST FAILED:", request.url(), request.failure()?.errorText);
  });

  // First click - ignore this result (warmup)
  console.log("Warmup (ignoring result)...");
  await clickElement(page, "#runlots");
  // Wait for the operation to complete
  await page.waitForFunction(() => {
    const tbody = document.querySelector("tbody");
    return tbody && tbody.children.length === 10000;
  }, { timeout: 10000 }).catch(() => {
    // Continue even if timeout
  });
  await wait(500);

  // Clear Timer.totResults to start fresh
  await page.evaluate(() => {
    if ((window as any).Timer) {
      (window as any).Timer.totResults = [];
    }
  });

  // Run 5 iterations
  const results: number[] = [];
  const numIterations = 5;
  console.log(`Running ${numIterations} iterations...`);
  
  for (let iteration = 0; iteration < numIterations; iteration++) {
    console.log(`  Iteration ${iteration + 1}/${numIterations}...`);
    
    // Clear Timer.totResults before each iteration
    await page.evaluate(() => {
      if ((window as any).Timer) {
        (window as any).Timer.totResults = [];
      }
    });
    
    await clickElement(page, "#runlots");
    
    // Wait for the operation to complete
    await page.waitForFunction(() => {
      const tbody = document.querySelector("tbody");
      return tbody && tbody.children.length === 10000;
    }, { timeout: 10000 });
    
    // Wait for Timer.stop to execute and populate totResults
    await wait(500);
    
    // Get result from Timer.totResults
    const timerResult = await page.evaluate(() => {
      if ((window as any).Timer && (window as any).Timer.totResults) {
        const results = (window as any).Timer.totResults;
        if (results.length > 0) {
          return results[results.length - 1];
        }
      }
      return null;
    });

    if (timerResult === null) {
      // Try a few more times with short delays
      let found = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        await wait(100);
        const result = await page.evaluate(() => {
          if ((window as any).Timer && (window as any).Timer.totResults) {
            const results = (window as any).Timer.totResults;
            if (results.length > 0) {
              return results[results.length - 1];
            }
          }
          return null;
        });
        if (result !== null) {
          results.push(result);
          found = true;
          break;
        }
      }
      
      if (!found) {
        // Debug: log what we can see
        const debugInfo = await page.evaluate(() => {
          return {
            hasWindowTimer: !!(window as any).Timer,
            hasGlobalTimer: !!(globalThis as any).Timer,
            windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('timer')),
            timerTotResults: (window as any).Timer ? (window as any).Timer.totResults : null,
          };
        });
        console.log("Debug info:", debugInfo);
        throw new Error(`Could not get timer result from Timer.totResults on iteration ${iteration + 1}`);
      }
    } else {
      results.push(timerResult);
    }
    
    // Small delay between iterations
    if (iteration < numIterations - 1) {
      await wait(200);
    }
  }

  // Calculate and return the average of the 5 iterations
  const average = results.reduce((sum, val) => sum + val, 0) / results.length;
  console.log(`  Average: ${average.toFixed(2)} ms`);
  return average;
}

async function runTest() {
  // Combine framework argument from --framework flag and positional args
  let frameworkArgument = args.framework ? args.framework : allArgs;
  
  let matchesDirectoryArg = (directoryName: string) =>
    frameworkArgument.length === 0 || frameworkArgument.some((arg: string) => {
      // Check if the argument matches the directory name
      // Can be "doohtml-prov-tc" or "keyed/doohtml-prov-tc"
      return arg === directoryName || 
             arg === directoryName.split('/').pop() ||
             directoryName.includes(arg);
    });
  
  let runFrameworks = await initializeFrameworks(benchmarkOptions, matchesDirectoryArg);
  
  // If framework argument is provided, filter by it (exact match only)
  if (frameworkArgument.length > 0) {
    runFrameworks = runFrameworks.filter((f) => {
      return frameworkArgument.some((arg: string) => {
        // Exact match on name (e.g., "doohtml-prov-tc" should NOT match "doohtml-prov-tc-bind")
        if (f.name === arg) return true;
        // Check if full name matches exactly (e.g., "keyed/doohtml-prov-tc")
        const fullNameMatch = f.fullNameWithKeyedAndVersion === arg || 
                             f.fullNameWithKeyedAndVersion === `${arg}-keyed` ||
                             f.fullNameWithKeyedAndVersion === `keyed/${arg}`;
        if (fullNameMatch) return true;
        // Check if it's a path match like "keyed/doohtml-prov-tc"
        if (arg.includes('/')) {
          const parts = arg.split('/');
          if (parts.length === 2 && parts[1] === f.name) return true;
        }
        return false;
      });
    });
  } else {
    // Default frameworks to test
    const defaultFrameworks = [
      "doohtml-prov-tc",
      "doohtml-prov-tc-bind",
      "doohtml-prov-nv",
      "doohtml-prov-nv-bind",
    //  "doohtml-prov-nv-bind-200",
      "doohtml-prov-nv-bind-store",
    //  "doohtml-buildData-tc",
    //  "doohtml-prov-tc-min",
      "vanillajs-lite-timer",
    //  "vanillajs-timer"
    ];
    runFrameworks = runFrameworks.filter((f) => 
      defaultFrameworks.includes(f.name)
    );
  }
  
  console.log("Frameworks that will be tested:", runFrameworks.map((f) => f.fullNameWithKeyedAndVersion).join(" "));

  if (runFrameworks.length === 0) {
    console.log("No frameworks found to test");
    return;
  }

  let browser = await startBrowser(benchmarkOptions);
  
  // Store batch averages for each framework
  const frameworkBatchAverages: Map<string, number[]> = new Map();
  const frameworkVersions: Map<string, string> = new Map();
  const numBatches = args.batches as number;
  
  try {
    // Run N batches
    for (let batch = 0; batch < numBatches; batch++) {
      console.log(`\n=== Batch ${batch + 1}/${numBatches} ===\n`);
      
      // Test each framework in this batch
      for (let i = 0; i < runFrameworks.length; i++) {
        const framework = runFrameworks[i];
        const frameworkKey = framework.fullNameWithKeyedAndVersion.replace(/-keyed$/, '');
        
        const page = await browser.newPage();
        try {
          const batchAverage = await testRunLots(framework, page, args.yalc);
          
          // Get version for the result (only on first batch)
          if (batch === 0) {
            const version = await page.evaluate(() => {
              const verElement = document.querySelector(".ver");
              if (verElement) {
                const text = verElement.textContent || "";
                const match = text.match(/(v[\d.]+[^\s]*)/);
                return match ? match[1] : "";
              }
              return "";
            });
            frameworkVersions.set(frameworkKey, version);
          }
          
          // Store the batch average
          if (!frameworkBatchAverages.has(frameworkKey)) {
            frameworkBatchAverages.set(frameworkKey, []);
          }
          frameworkBatchAverages.get(frameworkKey)!.push(batchAverage);
          
          console.log(`Batch ${batch + 1} result for ${framework.fullNameWithKeyedAndVersion}: ${batchAverage.toFixed(2)} ms\n`);
        } catch (error) {
          console.log(`ERROR testing ${framework.fullNameWithKeyedAndVersion} in batch ${batch + 1}:`, error);
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  
  // Calculate final averages and build results array
  const results: Array<{
    framework: string;
    version: string;
    result: number[];
    average: number;
    timestamp: string;
  }> = [];
  
  for (const [frameworkKey, batchAverages] of frameworkBatchAverages.entries()) {
    const finalAverage = batchAverages.reduce((sum, val) => sum + val, 0) / batchAverages.length;
    const version = frameworkVersions.get(frameworkKey) || "";
    
    results.push({
      framework: frameworkKey,
      version: version,
      result: batchAverages,
      average: finalAverage,
      timestamp: new Date().toISOString()
    });
    
    console.log(`\n=== Final Result for ${frameworkKey} ===`);
    console.log(`Version: ${version}`);
    console.log(`Batch averages: ${batchAverages.map(r => r.toFixed(2)).join(', ')} ms`);
    console.log(`Overall average: ${finalAverage.toFixed(2)} ms`);
    console.log(`========================================\n`);
  }
  
  // Sort results by lowest average time (ascending)
  results.sort((a, b) => a.average - b.average);
  
  // Write results to myRunLots.json
  const outputFile = "myRunLots.json";
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), { encoding: "utf8" });
  console.log(`\nResults written to ${outputFile} (sorted by lowest time)`);
}

async function main() {
  if (args.help) {
    // yargs.showHelp();
  } else {
    await runTest();
  }
}

main().catch((error) => {
  console.log("Error in doo-testRunLots", error);
  process.exit(1);
});
