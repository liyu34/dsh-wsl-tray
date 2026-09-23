/**
 * dsh-wsl-tray host entry. Mounts the loopback API that generates the Windows
 * desktop shortcut, the WSL start script, and the Windows tray helper. The
 * browser half registers the matching settings section on its own — current
 * DSH retired the host-registered settings namespace — so every fact the
 * section shows, and the configurable source-project path it writes, flows
 * through the `/dsh-wsl-tray/*` routes mounted here.
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-wsl-tray";
/**
 * Mount the HTTP API the browser section talks to. The section is a client-only
 * contribution; the host owns the generated artifacts and the per-install state
 * behind these routes.
 * @param ctx - Host context that may acquire the webserver service.
 */
export declare function apply(ctx: Context): void;
