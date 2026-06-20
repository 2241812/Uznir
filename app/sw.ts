/// <reference lib="webworker" />

import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (string | { url: string; revision?: string })[];
  }
}

const sw = new Serwist({
  precacheEntries: self.__SW_MANIFEST as unknown as string[],
});

// Serwist v9: addEventListeners handles install, activate, fetch, and message
sw.addEventListeners();
