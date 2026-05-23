/**
 * Pi-mono singleton instance manager.
 * Lazily initializes PiMonoCore and provides a PiMonoWrapper to services.
 */
import { PiMonoCore } from "./core";
import { PiMonoWrapper } from "../services/pi-mono-wrapper";

let wrapper: PiMonoWrapper | null = null;
let initPromise: Promise<PiMonoWrapper> | null = null;

export async function initializePiMono(): Promise<PiMonoWrapper> {
  if (wrapper) return wrapper;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const core = await PiMonoCore.create();
    wrapper = new PiMonoWrapper(core);
    return wrapper;
  })();

  return initPromise;
}

export function getPiMonoWrapper(): PiMonoWrapper {
  if (!wrapper) {
    throw new Error("Pi-mono not initialized. Call initializePiMono() first.");
  }
  return wrapper;
}

export function shutdownPiMono(): void {
  wrapper = null;
  initPromise = null;
}
