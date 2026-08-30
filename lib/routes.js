/**
 * The plugin's loopback HTTP API, consumed by the settings card. The fence is
 * the same DNS-rebinding defense as the /api gateway: Host-header loopback and
 * same-origin browser markers only. It is not authentication.
 */
export const TRAY_ROUTE_PREFIX = '/dsh-wsl-tray';
/** Header lookup that accepts both node's string and string[] shapes. */
function header(headers, name) {
    const value = headers[name];
    return typeof value === 'string' ? value : undefined;
}
/** Host-header loopback check (localhost, [::1], or any 127.x.y.z). */
function isLoopbackHostname(hostname) {
    if (hostname === 'localhost' || hostname === '[::1]')
        return true;
    const parts = hostname.split('.');
    return parts.length === 4
        && parts[0] === '127'
        && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
/** Whether the request may reach plugin routes. */
export function isTrustedRequest(req) {
    const host = header(req.headers, 'host');
    if (host === undefined)
        return false;
    let hostUrl;
    try {
        hostUrl = new URL(`http://${host}`);
    }
    catch {
        return false;
    }
    if (!isLoopbackHostname(hostUrl.hostname))
        return false;
    if (header(req.headers, 'sec-fetch-site') === 'cross-site')
        return false;
    const origin = header(req.headers, 'origin');
    if (origin === undefined)
        return true;
    try {
        return new URL(origin).host === hostUrl.host;
    }
    catch {
        return false;
    }
}
function writeJson(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
}
/** Write a non-Status JSON object (project-path responses). */
function writeObject(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
}
/** Read a small JSON request body; returns null when absent/unparsable/oversized. */
async function readJsonBody(req) {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
        const piece = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
        total += piece.length;
        // The routes only accept one short string field; refuse anything larger
        // instead of buffering an unbounded body.
        if (total > 64 * 1024)
            return null;
        chunks.push(piece);
    }
    if (chunks.length === 0)
        return null;
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    catch {
        return null;
    }
}
/**
 * Mount the /dsh-wsl-tray prefix route.
 * @param server - the host webserver service.
 * @param service - the generated-artifact service answering each method.
 * @returns the route disposer.
 */
export function registerTrayRoutes(server, service) {
    return server.register({
        kind: 'prefix',
        path: TRAY_ROUTE_PREFIX,
        handler: async (req, res) => {
            if (!isTrustedRequest(req)) {
                writeJson(res, 403, { ...await service.status(), ok: false, lastError: 'forbidden' });
                return;
            }
            const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname;
            if (pathname === `${TRAY_ROUTE_PREFIX}/status` && (req.method === 'GET' || req.method === 'HEAD')) {
                writeJson(res, 200, await service.status());
                return;
            }
            if (pathname === `${TRAY_ROUTE_PREFIX}/watchdog` && (req.method === 'GET' || req.method === 'HEAD')) {
                writeObject(res, 200, { ok: true, watchdog: await service.watchdogStatus() });
                return;
            }
            if (pathname === `${TRAY_ROUTE_PREFIX}/watchdog-log` && (req.method === 'GET' || req.method === 'HEAD')) {
                const wanted = Number(new URL(req.url ?? '/', 'http://dsh.internal').searchParams.get('lines') ?? '200');
                writeObject(res, 200, { ok: true, ...await service.watchdogLog(Number.isFinite(wanted) ? wanted : 200) });
                return;
            }
            if (pathname === `${TRAY_ROUTE_PREFIX}/regenerate` && req.method === 'POST') {
                const body = await service.regenerate();
                writeJson(res, body.ok ? 200 : 500, body);
                return;
            }
            if (pathname === `${TRAY_ROUTE_PREFIX}/project-path`) {
                if (req.method === 'GET' || req.method === 'HEAD') {
                    writeObject(res, 200, { ok: true, projectPath: service.getProjectPath() });
                    return;
                }
                if (req.method === 'POST') {
                    const payload = await readJsonBody(req);
                    const projectPath = payload !== null && typeof payload === 'object'
                        ? payload.projectPath
                        : undefined;
                    if (typeof projectPath !== 'string') {
                        writeObject(res, 400, { ok: false, error: 'projectPath must be a string' });
                        return;
                    }
                    await service.setProjectPath(projectPath);
                    writeObject(res, 200, { ok: true, projectPath: service.getProjectPath() });
                    return;
                }
            }
            writeJson(res, 404, { ...await service.status(), ok: false, lastError: 'not found' });
        },
    });
}
