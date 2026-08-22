/**
 * dsh-wsl-tray host entry. Mounts the loopback API that generates the Windows
 * desktop shortcut, the WSL start script, and the Windows tray helper. The
 * settings namespace registered here is the join key the browser card uses.
 */
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings';
import z from '@deepseek-ai/schemastery';
import { DEFAULT_SHORTCUT_NAME } from "./artifacts.js";
import { registerTrayRoutes } from "./routes.js";
import { TrayService } from "./service.js";
export const name = 'dsh-wsl-tray';
/** The settings namespace the browser card keys itself to. */
export const TRAY_SETTINGS_NS = settingsNamespace('dsh-wsl-tray');
/** The card dispatches on the namespace only; no editable fields are exposed. */
const EmptySchema = z.object({});
/**
 * Register the namespace and the HTTP API. The namespace exists so the
 * plugin-configuration tab dispatches this plugin's card; the card's button
 * then drives the routes below, which own the actual work.
 * @param ctx - Host context that may acquire the settings and webserver services.
 */
export function apply(ctx) {
    installSettingsSection(ctx, TRAY_SETTINGS_NS, EmptySchema, {}, {
        setSource: () => { },
        onChange: () => { },
    });
    ctx.inject(['webServer'], (hostCtx) => {
        const server = hostCtx.webServer;
        const service = new TrayService({ logger: hostCtx.logger }, server, DEFAULT_SHORTCUT_NAME);
        hostCtx.effect(() => registerTrayRoutes(server, service), 'dsh-wsl-tray: http routes');
        // First boot (or a repair after files were deleted) recreates the desktop
        // shortcut without waiting for the user to open the settings card.
        void service.ensure().catch((error) => {
            hostCtx.logger.warn(`[dsh-wsl-tray] ensure failed: ${error instanceof Error ? error.message : String(error)}`);
        });
    });
}
