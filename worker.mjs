import fs from "fs";
import path from "path";
import { workerData, parentPort } from "worker_threads";
// TODO: Implement a timeout mechanism to handle cases where a worker might hang
// indefinitely (e.g., due to an infinite loop or deadlock) and never send an exit or error signal.
// This would prevent the main thread from waiting forever.

// TODO: Implement your own assertions (expect, toThrow, toContain, not, ...)
// The code inside eval(content) knows about your expect method because expect
// is defined directly within the runTest function, which is the lexical scope
// where eval(content) is called. Therefore, expect is available in the scope
// that the evaluated content code executes in.
// function expect(receivedVal) {
//   return {
//     toBe(expectedVal) {
//       if (receivedVal !== expectedVal)
//         throw new Error(
//           `Expected '${expectedVal}' but received '${receivedVal}'!`,
//         );
//     },
//   };
// }
import expect from "expect";

// `runTest` encapsulates the logic for processing a single test file.
function runTest(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    if (!content) {
      return { success: false, errorMessage: "Test file is empty." };
    }

    eval(content);
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
