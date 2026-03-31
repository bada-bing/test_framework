import fs from "fs";
import path from "path";
import { workerData } from "worker_threads";

// `runTest` encapsulates the logic for processing a single test file.
function runTest(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");

  console.log(
    `\n=== Worker thread: ${path.relative(process.cwd(), filePath)} ===\n${content}`,
  );
}

// `workerData` is the object passed from the main thread when spawning this worker.
// In our case it contains `{ filePath }` — the absolute path of the test file.
const { filePath } = workerData;
runTest(filePath);
