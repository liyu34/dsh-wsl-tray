/**
 * dsh-wsl-tray host entry. Mounts the loopback API that generates the Windows
 * desktop shortcut, the WSL start script, and the Windows tray helper. The
 * settings namespace registered here is the join key the browser card uses;
 * the configurable source-project path is persisted by the TrayService itself
 * through `/dsh-wsl-tray/project-path`.
 */

import type { Context } from '@deepseek-ai/cordis'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { DEFAULT_SHORTCUT_NAME } from './artifacts.ts'
import { registerTrayRoutes } from './routes.ts'
import { TrayService } from './service.ts'
import type { WebServerLike as RouteWebServer } from './routes.ts'
import type { WebServerLike as ServiceWebServer } from './service.ts'

export const name = 'dsh-wsl-tray'

/** The settings namespace the browser card keys itself to. */
export const TRAY_SETTINGS_NS = settingsNamespace('dsh-wsl-tray')

/** The card dispatches on the namespace only; card state lives in the service. */
const EmptySchema = z.object({})

/**
 * Register the namespace and the HTTP API. The namespace exists so the
 * plugin-configuration tab dispatches this plugin's card; the card then reads
 * and writes the service through the routes below.
 * @param ctx - Host context that may acquire the settings and webserver services.
 */
export function apply(ctx: Context): void {
  installSettingsSection(
    ctx,
    TRAY_SETTINGS_NS,
    EmptySchema,
    {},
    {
      setSource: () => {},
      onChange: () => {},
    },
  )

  ctx.inject(['webServer'], (hostCtx: Context) => {
    const server = (hostCtx as Context & { webServer: RouteWebServer & ServiceWebServer }).webServer
    const service = new TrayService({ logger: hostCtx.logger }, server, DEFAULT_SHORTCUT_NAME)
    hostCtx.effect(() => registerTrayRoutes(server, service), 'dsh-wsl-tray: http routes')
    // First boot (or a repair after files were deleted) recreates the desktop
    // shortcut without waiting for the user to open the settings card.
    void service.ensure().catch((error: unknown) => {
      hostCtx.logger.warn(`[dsh-wsl-tray] ensure failed: ${error instanceof Error ? error.message : String(error)}`)
    })
  })
}
