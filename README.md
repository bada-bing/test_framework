# Test Framework

A minimal Node.js test framework that discovers test files and runs each one in a dedicated worker thread.

## Architecture

The framework is split into two main components: the main thread that orchestrates the work, and the worker threads that execute the tests.

### `index.mjs` — Main thread

- Uses [`jest-haste-map`](https://github.com/jestjs/jest/tree/main/packages/jest-haste-map) to crawl the project and discover all `*.test.js` files.
- Spawns one `Worker` per file, passing the file path via `workerData`.

#### Resolving Worker Paths with `new URL()`

To tell the `Worker` constructor which script to run, we use `new URL('./worker.mjs', import.meta.url)`.

- **How it works**: This creates a full, absolute URL to `worker.mjs`. It uses the location of the current module (`import.meta.url`) as the base and resolves the relative path (`./worker.mjs`) from there.
- **Why it's important for ESM**: In modern Node.js (ES Modules), file paths are treated as `file://` URLs. This is the standard way to get a file path relative to the current module, replacing the `__dirname` variable from older CommonJS modules. It differs from the `path` module, which manipulates path *strings* rather than creating URL objects.

### `worker.mjs` — Worker thread

- Receives `filePath` from `workerData`.
- Reads the file and prints its path and content in a **single atomic `console.log`** — guaranteeing the output is never interleaved with output from sibling workers.

#### How Node.js Worker Threads Work

A Worker Thread is a separate, parallel stream of execution. Each worker:

1.  **Runs in Isolation**: It has its own V8 engine instance, its own event loop, and its own memory.
2.  **Prevents Blocking**: It executes its script (`worker.mjs`) without blocking the main thread. This is crucial for performance, as it allows the main application to remain responsive while the workers perform CPU-intensive tasks in the background.
3.  **Receives and Sends Data**: It's initialized with data from the main thread via the `workerData` property, and sends results or data back to the main thread using `parentPort.postMessage()`, which the main thread receives via `worker.on('message', ...)` events.

## How it works

```
node index.mjs
  └─ Main thread
       ├─ jest-haste-map discovers all *.test.js files
       └─ for each file → new Worker("./worker.mjs", { workerData: { filePath } })
            └─ Worker thread
                 ├─ reads workerData.filePath
                 ├─ fs.readFileSync(filePath)
                 └─ single console.log(path + content)  ← atomic, no interleaving
```

## Running

```bash
node index.mjs
```
