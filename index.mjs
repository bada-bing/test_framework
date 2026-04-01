import HasteMap from "jest-haste-map";
// jest-haste-map is a fast, cached file crawler used by Jest.
// It supports caching and file-watching, so subsequent runs only process changed files.
import os from "os";
import fs from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";
import { Worker } from "worker_threads";
import chalk from "chalk";

// Worker lets us spawn isolated Node.js threads.
// Each worker gets its own V8 instance and event loop — perfect for running tests in parallel.

// `import.meta.url` is the file:// URL of this module.
// `fileURLToPath` converts it to a regular file-system path so we can use it with `path` utilities.
const root = dirname(fileURLToPath(import.meta.url));

// Ensure the cache directory exists before HasteMap tries to write to it.
fs.mkdirSync(join(root, ".cache"), { recursive: true });

const map = await HasteMap.create({
  id: "test-framework", // Cache key — change this if you want a fresh cache.
  extensions: ["js"], // Only crawl .js files; ignore .ts, .json, etc.
  maxWorkers: os.availableParallelism(), // Use all available CPU cores for crawling.
  platforms: [], // Only needed for React Native platform-specific files.
  roots: [root], // Directories to search; defaults to the whole rootDir.
  retainAllFiles: true, // Keep all files in the map, not just haste modules.
  rootDir: root, // The project root — all paths are resolved relative to this.
  cacheDirectory: join(root, ".cache"),
});

// `build()` triggers the actual file crawl (or loads from cache if nothing changed).
// hasteFS is an in-memory virtual file system over the crawled results.
const { hasteFS } = await map.build();

// matchFilesWithGlob returns a Set of absolute paths matching the given pattern.
const testFiles = hasteFS.matchFilesWithGlob(["**/*.test.js"]);

const spawningWorkersMessage = `⋙⋙⋙ Found ${testFiles.size} test file(s). Spawning workers… ⋘⋘⋘\n`;

console.log(chalk.underline(chalk.blue(spawningWorkersMessage.toUpperCase())));

let hasFailed = false;

const promises = [];

// Spawn one dedicated worker thread for each test file.
// Workers run in parallel — they do not block each other or the main thread.
for (const filePath of testFiles) {
  promises.push(
    new Promise((resolve) => {
      const worker = new Worker(
        // Using `new URL("./worker.mjs", import.meta.url)` keeps the path relative
        // and works correctly regardless of where Node is started from.
        // URL is a standard Web API available in both browsers and Node.js. It works with URLs, not just file paths. In modern ES Modules (.mjs files or "type": "module" in package.json), file paths are treated as `file://` URLs.
        new URL("./worker.mjs", import.meta.url),
        {
          // `workerData` is the main thread's way of passing initial data to a worker.
          // It is structured-cloned (deep-copied), so changes in the worker don't affect us.
          workerData: { filePath },
        },
      );

      worker.on("message", (result) => {
        if (result.success) {
          console.log(
            chalk.inverse(chalk.green("PASS")),
            chalk.green(`✔ Test passed: ${relative(process.cwd(), filePath)}`),
          );
        } else {
          console.error(
            chalk.inverse(chalk.red("FAIL")),
            chalk.red(`✖ Test failed: ${relative(process.cwd(), filePath)}`),
            `\n  ${result.errorMessage}`,
          );
          hasFailed = true;
        }
      });

      // Listen for unhandled errors thrown inside the worker.
      worker.on("error", (err) => {
        console.error(`[worker] Error in ${filePath}:`, err);
        hasFailed = true;
        resolve();
      });

      // A non-zero exit code means the worker crashed or called process.exit(n).
      worker.on("exit", (code) => {
        if (code !== 0) {
          console.error(
            `[worker] Worker for ${filePath} exited with code ${code}`,
          );
          hasFailed = true;
        }
        resolve();
      });
    }),
  );
}
await Promise.all(promises);

if (hasFailed === true) {
  console.log("The test run failed, fix your tests");
  process.exitCode = 1;
}
