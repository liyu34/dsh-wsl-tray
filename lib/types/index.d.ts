/**
 * dsh-wsl-tray host entry. Mounts the loopback API that generates the Windows
 * desktop shortcut, the WSL start script, and the Windows tray helper. The
 * settings namespace registered here is the join key the browser card uses.
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-wsl-tray";
/** The settings namespace the browser card keys itself to. */
export declare const TRAY_SETTINGS_NS: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/**
 * Register the namespace and the HTTP API. The namespace exists so the
 * plugin-configuration tab dispatches this plugin's card; the card's button
 * then drives the routes below, which own the actual work.
 * @param ctx - Host context that may acquire the settings and webserver services.
 */
export declare function apply(ctx: Context): void;
