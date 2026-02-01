import yargs from "yargs";
import { checkElementExists, clickElement, startBrowser } from "./puppeteerAccess.js";
import { FrameworkData, initializeFrameworks, BenchmarkOptions, wait } from "./common.js";
import { Page } from "puppeteer-core";

let args: any = yargs(process.argv)
  .usage("$0 [--framework Framework1] [--chromeBinary path]")
  .help("help")
  .boolean("headless")
  .default("headless", false)
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

async function testRunLots(framework: FrameworkData, page: Page): Promise<number> {
  console.log(`Testing runLots for ${framework.fullNameWithKeyedAndVersion}`);
  
  // Navigate to the framework page
  await page.goto(`http://${benchmarkOptions.host}:${benchmarkOptions.port}/${framework.uri}/index.html`, {
    waitUntil: "networkidle0",
  });

  // Wait for the page to be ready
  await checkElementExists(page, "#runlots");

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

  // First click - ignore this result (warmup)
  console.log("First click (warmup - ignoring result)...");
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
    if ((globalThis as any).Timer) {
      (globalThis as any).Timer.totResults = [];
    }
  });

  // Second click - this is the test we care about
  console.log("Second click (measuring result)...");
  await clickElement(page, "#runlots");
  
  // Wait for the operation to complete
  await page.waitForFunction(() => {
    const tbody = document.querySelector("tbody");
    return tbody && tbody.children.length === 10000;
  }, { timeout: 10000 });
  await wait(500); // Give Timer.stop time to execute

  // Get result from Timer.totResults
  const timerResult = await page.evaluate(() => {
    if ((globalThis as any).Timer && (globalThis as any).Timer.totResults) {
      const results = (globalThis as any).Timer.totResults;
      if (results.length > 0) {
        return results[results.length - 1];
      }
    }
    return null;
  });

  if (timerResult === null) {
    throw new Error("Could not get timer result from Timer.totResults");
  }

  return timerResult;
}

async function runTest() {
  let matchesDirectoryArg = (directoryName: string) =>
    allArgs.length === 0 || allArgs.some((arg: string) => arg == directoryName);
  
  let runFrameworks = await initializeFrameworks(benchmarkOptions, matchesDirectoryArg);
  
  // Filter to only doohtml-prov-tc if no specific framework specified
  if (allArgs.length === 0 && (!args.framework || args.framework.length === 0)) {
    runFrameworks = runFrameworks.filter((f) => f.name === "doohtml-prov-tc");
  }
  
  console.log("Frameworks that will be tested:", runFrameworks.map((f) => f.fullNameWithKeyedAndVersion).join(" "));

  if (runFrameworks.length === 0) {
    console.log("No frameworks found to test");
    return;
  }

  let browser = await startBrowser(benchmarkOptions);
  
  try {
    for (let i = 0; i < runFrameworks.length; i++) {
      const page = await browser.newPage();
      try {
        const result = await testRunLots(runFrameworks[i], page);
        console.log(`\n=== Test Result for ${runFrameworks[i].fullNameWithKeyedAndVersion} ===`);
        console.log(`Test: tot`);
        console.log(`Result: ${result} ms`);
        console.log(`========================================\n`);
      } catch (error) {
        console.log(`ERROR testing ${runFrameworks[i].fullNameWithKeyedAndVersion}:`, error);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  if (args.help) {
    // yargs.showHelp();
  } else {
    await runTest();
  }
}

main().catch((error) => {
  console.log("Error in testRunLots", error);
  process.exit(1);
});
