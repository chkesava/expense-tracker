import { lazy, type ComponentType } from "react";

/**
 * A wrapper around React.lazy that catches dynamic import errors (such as ChunkLoadError or MIME type errors)
 * which occur when a new version of the app is deployed and the old chunk hashes are no longer present on the server.
 * It automatically reloads the page once to retrieve the latest version of the app.
 */
export function lazyWithRetry(componentImport: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Dynamic import failed. Attempting to reload the page to fetch the latest version...", error);
      
      // Store a flag in sessionStorage to prevent infinite reload loops if the server is actually down
      const hasReloaded = sessionStorage.getItem("chunk-reload-attempted");
      
      if (!hasReloaded) {
        sessionStorage.setItem("chunk-reload-attempted", "true");
        window.location.reload();
        // Return a pending promise that never resolves/rejects.
        // This keeps React in a Suspense state while the browser is unloading and reloading.
        return new Promise<{ default: ComponentType<any> }>(() => {});
      }
      
      // If we already tried reloading and it still failed, throw the error
      throw error;
    }
  });
}
