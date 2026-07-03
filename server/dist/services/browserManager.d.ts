/**
 * Global Browser Manager
 *
 * Maintains a single, global Playwright BrowserServer instance for the entire backend.
 * Uses reference counting (activeConnections) to track how many scripts are currently running.
 * When the count reaches 0, an idle timer starts. If no scripts request the browser
 * within the IDLE_TIMEOUT_MS, the browser is shut down to free up memory.
 */
declare class BrowserManager {
    private browserServer;
    private wsEndpoint;
    private activeConnections;
    private idleTimer;
    private launchPromise;
    /**
     * Returns the WebSocket endpoint of the shared Chromium server.
     * If the server is not running, it launches it.
     * If it is currently launching, it waits for the launch to finish.
     */
    getWsEndpoint(): Promise<string>;
    /**
     * Called by a script runner when it finishes executing.
     * Decrements the active connection count. If it hits 0, starts the idle timer.
     */
    release(): void;
    /**
     * Immediately terminates the shared browser and resets the manager.
     */
    forceClose(): Promise<void>;
}
export declare const browserManager: BrowserManager;
export {};
//# sourceMappingURL=browserManager.d.ts.map