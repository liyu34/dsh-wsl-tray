/**
 * The plugin's loopback HTTP API, consumed by the settings card. The fence is
 * the same DNS-rebinding defense as the /api gateway: Host-header loopback and
 * same-origin browser markers only. It is not authentication.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { TrayService } from './service.ts';
export declare const TRAY_ROUTE_PREFIX = "/dsh-wsl-tray";
/** Whether the request may reach plugin routes. */
export declare function isTrustedRequest(req: IncomingMessage): boolean;
/** The webserver register face used by this plugin. */
export interface WebServerLike {
    register(route: {
        kind: 'prefix';
        path: string;
        handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
    }): () => void;
}
/**
 * Mount the /dsh-wsl-tray prefix route.
 * @param server - the host webserver service.
 * @param service - the generated-artifact service answering each method.
 * @returns the route disposer.
 */
export declare function registerTrayRoutes(server: WebServerLike, service: TrayService): () => void;
