import { registerHandler, type IpcHandlerFn } from "./handler";
import type { ChannelName, ChannelRequest } from "../../src/lib/ipc/channels";

export interface ChannelRoute<C extends string = string> {
  channel: C;
  service: string;
  method: string;
  params?(req: C extends ChannelName ? ChannelRequest<C> : unknown): unknown[];
  wrap?: string;
  transform?(result: unknown): unknown;
}

export type ServiceRegistry = Map<string, object>;

export function createServiceRegistry(): ServiceRegistry {
  return new Map();
}

/** Type-safe route builder — infers request type from channel literal */
export function route<C extends ChannelName>(def: ChannelRoute<C>): ChannelRoute<C> {
  return def;
}

export async function dispatch(
  route: ChannelRoute,
  req: unknown,
  registry: ServiceRegistry,
): Promise<unknown> {
  if (!/^[a-zA-Z]+:[a-zA-Z]+$/.test(route.channel)) {
    throw new Error(`Invalid channel format: "${route.channel}" (expected "module:action")`);
  }

  const service = registry.get(route.service);
  if (!service) {
    throw new Error(`Service not found: ${route.service}`);
  }

  const method = (service as Record<string, unknown>)[route.method];
  if (typeof method !== "function") {
    throw new Error(`Method not found: ${route.method} on service ${route.service}`);
  }

  const args = route.params ? route.params(req) : [req];
  const result = await (method as (...a: unknown[]) => unknown).apply(service, args);

  if (route.transform) {
    return route.transform(result);
  }
  if (route.wrap) {
    return { [route.wrap]: result };
  }
  return result;
}

export function registerRoutes(
  routes: ChannelRoute[],
  registry: ServiceRegistry,
): void {
  for (const route of routes) {
    registerHandler(route.channel as ChannelName, async (_event, req) => dispatch(route, req, registry) as never);
  }
}
