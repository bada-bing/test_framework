import fs from "fs";
import path from "path";
import { workerData, parentPort } from "worker_threads";

// `runTest` encapsulates the logic for processing a single test file.
function runTest(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    if (!content) {
      return { success: false, errorMessage: "Test file is empty." };
    }
    console.log(
      `\n=== Worker thread: ${path.relative(
        process.cwd(),
        filePath,
      )} ===\n${content}`,
    );
    return { success: true, errorMessage: null };
  } catch (error) {
    return { success: false, errorMessage: error.message };
  }
}

// `workerData` is the object passed from the main thread when spawning this worker.
// In our case it contains `{ filePath }` — the absolute path of the test file.
const { filePath } = workerData;
const result = runTest(filePath);

// Send the result back to the main thread.
parentPort.postMessage(result);
