/**
 * Global Browser Manager
 *
 * Maintains a single, global Playwright BrowserServer instance for the entire backend.
 * Uses reference counting (activeConnections) to track how many scripts are currently running.
 * When the count reaches 0, an idle timer starts. If no scripts request the browser
 * within the IDLE_TIMEOUT_MS, the browser is shut down to free up memory.
 */

import { chromium, type BrowserServer } from 'playwright';

const IDLE_TIMEOUT_MS = 30000; // 30 seconds

class BrowserManager {
  private browserServer: BrowserServer | null = null;
  private wsEndpoint: string | null = null;
  private activeConnections = 0;
  private idleTimer: NodeJS.Timeout | null = null;
  private launchPromise: Promise<string> | null = null;

  /**
   * Returns the WebSocket endpoint of the shared Chromium server.
   * If the server is not running, it launches it.
   * If it is currently launching, it waits for the launch to finish.
   */
  public async getWsEndpoint(): Promise<string> {
    // Cancel the idle shutdown timer since we need the browser now
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    this.activeConnections++;

    // Fast path: already running
    if (this.wsEndpoint) {
      return this.wsEndpoint;
    }

    // Currently launching by another request? Wait for it.
    if (this.launchPromise) {
      return this.launchPromise;
    }

    // Needs to be launched
    this.launchPromise = (async () => {
      console.log('[BROWSER] Launching global shared Chromium instance...');
      try {
        this.browserServer = await chromium.launchServer({ headless: true });
        this.wsEndpoint = this.browserServer.wsEndpoint();
        console.log('[BROWSER] Global Chromium instance ready');
        return this.wsEndpoint;
      } catch (err) {
        console.error('[BROWSER] Failed to launch global Chromium:', err);
        // Reset state so subsequent calls can retry
        this.browserServer = null;
        this.wsEndpoint = null;
        this.launchPromise = null;
        this.activeConnections--;
        throw err;
      }
    })();

    const endpoint = await this.launchPromise;
    this.launchPromise = null;
    return endpoint;
  }

  /**
   * Called by a script runner when it finishes executing.
   * Decrements the active connection count. If it hits 0, starts the idle timer.
   */
  public release(): void {
    if (this.activeConnections <= 0) return; // safeguard

    this.activeConnections--;

    if (this.activeConnections === 0 && this.browserServer) {
      // Start countdown to shutdown
      this.idleTimer = setTimeout(() => {
        this.forceClose();
      }, IDLE_TIMEOUT_MS);
    }
  }

  /**
   * Immediately terminates the shared browser and resets the manager.
   */
  public async forceClose(): Promise<void> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    if (this.browserServer) {
      console.log('[BROWSER] Shutting down idle global Chromium instance');
      try {
        await this.browserServer.close();
      } catch (err) {
        console.error('[BROWSER] Error closing Chromium instance:', err);
      }
      this.browserServer = null;
    }
    this.wsEndpoint = null;
    this.launchPromise = null;
    this.activeConnections = 0;
  }
}

// Export a singleton instance
export const browserManager = new BrowserManager();
