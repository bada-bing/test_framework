import fs from "fs";
import { workerData } from "worker_threads";

// `workerData` is the object passed from the main thread when spawning this worker.
// In our case it contains `{ filePath }` — the absolute path of the test file.
const { filePath } = workerData;

// Read the full content of the test file synchronously.
// Since each worker is an isolated thread, blocking here only affects this one worker —
// it does not block the main thread or any sibling workers.
const content = fs.readFileSync(filePath, "utf-8");

// A single console.log call is written as one atomic chunk to stdout.
// This means Node.js cannot interleave it with output from other worker threads,
// so the header and file content will always appear together.
console.log(`\n=== Worker thread: ${filePath} ===\n${content}`);
