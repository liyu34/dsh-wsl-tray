/**
 * The WSL desktop/tray launcher service: writes the three generated artifacts
 * (icon, Windows tray helper, WSL start script) and creates the desktop
 * shortcut through a single PowerShell `-Regenerate` run.
 */
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { DEFAULT_SHORTCUT_NAME, DEFAULT_WEB_URL, ICON_FILE_NAME, START_SCRIPT_NAME, TRAY_SCRIPT_NAME, TRAY_VBS_NAME, WSL_DIR_NAME, WIN_DIR_REL, buildStartScript, buildTrayScript, buildTrayVbs, } from "./artifacts.js";
import { distroName, fallbackWindowsProfileWslPath, isWsl, runWindowsPowerShell, windowsDesktopWslPath, windowsUserProfileWslPath, } from "./windows.js";
/** Convert a WSL `/mnt/c/...` path to the Windows `C:\...` form. */
export function wslPathToWindowsPath(path) {
    const match = /^\/mnt\/([a-zA-Z])\/(.*)$/.exec(path);
    if (match !== null)
        return `${match[1].toUpperCase()}:\\${match[2].replace(/\//g, '\\')}`;
    return path.replace(/\//g, '\\');
}
/** The DSH web URL for a bound webserver host/port. */
export function webUrlFor(webServer) {
    const host = webServer.host === '0.0.0.0' ? '127.0.0.1' : webServer.host;
    return `http://${host}:${webServer.port}`;
}
/** Locate this package's bundled icon bytes. */
async function readIconBytes() {
    const here = dirname(fileURLToPath(import.meta.url));
    const candidate = join(here, '..', 'assets', ICON_FILE_NAME);
    try {
        return await readFile(candidate);
    }
    catch {
        return null;
    }
}
/** The WSL-side directory holding the generated start script. */
export function wslAppDir() {
    return join(homedir(), '.dsh', WSL_DIR_NAME);
}
/**
 * Derive DSH launch candidates from the running host process.
 *
 * The generated start.sh tries, in order:
 * 1. `dsh` on PATH (global npm / pnpm / binary installs);
 * 2. the source checkout CLI at `~/deepseek-harness/apps/cli/lib/bin.js`;
 * 3. the current process argv[1] when it is a real JS CLI (npm global or npx
 *    cache while it lasts);
 * 4. `npx --yes dsh` as the final self-healing fallback.
 *
 * Only paths that exist NOW are baked in; runtime fallbacks cover later moves.
 */
function resolveStartCommand() {
    const nodeBin = process.execPath;
    const repoCli = join(homedir(), 'deepseek-harness', 'apps', 'cli', 'lib', 'bin.js');
    const sourceCli = existsSync(repoCli) ? repoCli : null;
    const sourceCwd = sourceCli === null ? null : dirname(dirname(dirname(dirname(sourceCli))));
    const argv1 = process.argv[1];
    let bakedCli = null;
    if (argv1 !== undefined && argv1 !== sourceCli && /\.(?:js|mjs|cjs)$/.test(argv1) && existsSync(argv1)) {
        bakedCli = argv1;
    }
    return { nodeBin, sourceCli, sourceCwd, bakedCli };
}
/**
 * Owns the generated files and the shortcut lifecycle for one plugin mount.
 * All Windows process launches are fenced by the helpers in windows.ts.
 */
export class TrayService {
    ctx;
    webServer;
    shortcutName;
    cachedDesktopDir;
    constructor(ctx, webServer, shortcutName = DEFAULT_SHORTCUT_NAME) {
        this.ctx = ctx;
        this.webServer = webServer;
        this.shortcutName = shortcutName;
    }
    /** The Windows-side directory holding the icon and tray script. */
    windowsAppDir() {
        const profile = windowsUserProfileWslPath() ?? fallbackWindowsProfileWslPath();
        return profile === null ? null : join(profile, ...WIN_DIR_REL.split('/'));
    }
    /** Resolve the desktop once per mount; PowerShell is authoritative. */
    async desktopDir() {
        if (this.cachedDesktopDir !== undefined)
            return this.cachedDesktopDir;
        this.cachedDesktopDir = await windowsDesktopWslPath();
        return this.cachedDesktopDir;
    }
    /** Read the current on-disk facts. */
    async status() {
        const wsl = isWsl();
        const desktopDir = await this.desktopDir();
        const windowsProfileDir = windowsUserProfileWslPath() ?? fallbackWindowsProfileWslPath();
        const trayDir = this.windowsAppDir();
        const startScriptPath = join(wslAppDir(), START_SCRIPT_NAME);
        const shortcutPath = desktopDir === null ? null : join(desktopDir, `${this.shortcutName}.lnk`);
        return {
            ok: true,
            wsl,
            distro: distroName(),
            webUrl: wsl ? webUrlFor(this.webServer) : DEFAULT_WEB_URL,
            shortcutName: this.shortcutName,
            windowsProfileDir,
            desktopDir,
            shortcutPath,
            shortcutExists: shortcutPath !== null && existsSync(shortcutPath),
            trayDir,
            trayScriptExists: trayDir !== null && existsSync(join(trayDir, TRAY_SCRIPT_NAME)),
            trayVbsExists: trayDir !== null && existsSync(join(trayDir, TRAY_VBS_NAME)),
            iconExists: trayDir !== null && existsSync(join(trayDir, ICON_FILE_NAME)),
            startScriptPath,
            startScriptExists: existsSync(startScriptPath),
        };
    }
    /**
     * Build the two text artifacts for the current host facts. Null when the
     * DSH web CLI cannot be located (regenerate reports that as an error).
     */
    currentScripts() {
        const cli = resolveStartCommand();
        if (cli.sourceCli === null && cli.bakedCli === null)
            return null;
        const config = {
            distro: distroName(),
            webUrl: webUrlFor(this.webServer),
            shortcutName: this.shortcutName,
            wslStartScript: `~/.dsh/${WSL_DIR_NAME}/${START_SCRIPT_NAME}`,
        };
        return {
            startScript: buildStartScript({
                nodeBin: cli.nodeBin,
                sourceCli: cli.sourceCli,
                sourceCwd: cli.sourceCwd,
                bakedCli: cli.bakedCli,
                webUrl: config.webUrl,
            }),
            trayScript: buildTrayScript(config),
            trayVbs: buildTrayVbs(),
        };
    }
    /**
     * Ensure the four generated files exist AND match the current host facts
     * (web URL, CLI path, shortcut name). A stale start script from another
     * port/profile is a real failure mode, so compare content, not presence.
     */
    async ensure() {
        const base = await this.status();
        const filesExist = base.shortcutExists && base.trayScriptExists && base.trayVbsExists && base.iconExists && base.startScriptExists;
        if (!filesExist)
            return this.regenerate();
        const current = this.currentScripts();
        if (current === null)
            return base;
        try {
            const startMatches = await readFile(base.startScriptPath, 'utf8') === current.startScript;
            if (!startMatches)
                return this.regenerate();
            if (base.trayDir !== null) {
                const trayPath = join(base.trayDir, TRAY_SCRIPT_NAME);
                // The file is written with a UTF-8 BOM for Windows PowerShell 5.1.
                const trayMatches = await readFile(trayPath, 'utf8').then(text => text.replace(/^\uFEFF/, '') === current.trayScript);
                if (!trayMatches)
                    return this.regenerate();
                const vbsPath = join(base.trayDir, TRAY_VBS_NAME);
                const vbsMatches = await readFile(vbsPath, 'utf8') === current.trayVbs;
                if (!vbsMatches)
                    return this.regenerate();
            }
            return base;
        }
        catch {
            return this.regenerate();
        }
    }
    /** Write all artifacts and create/refresh the desktop shortcut. */
    async regenerate() {
        const base = await this.status();
        if (!base.wsl) {
            return {
                ...base,
                ok: false,
                lastError: 'dsh-wsl-tray only runs inside WSL; Windows desktop integration is unavailable here',
            };
        }
        const trayDir = this.windowsAppDir();
        if (trayDir === null) {
            return {
                ...base,
                ok: false,
                lastError: 'cannot determine the Windows user profile from the WSL environment (no /mnt/<drive>/Users/<name> in PATH)',
            };
        }
        const icon = await readIconBytes();
        if (icon === null) {
            return {
                ...base,
                ok: false,
                lastError: 'the bundled dsh.ico asset is missing from the installed package',
            };
        }
        const wslStartDir = wslAppDir();
        const scripts = this.currentScripts();
        if (scripts === null) {
            return {
                ...base,
                ok: false,
                lastError: 'cannot locate the DSH web CLI (process.argv[1] is not a JS file and ~/deepseek-harness/apps/cli/lib/bin.js is missing)',
            };
        }
        try {
            await mkdir(trayDir, { recursive: true });
            await mkdir(wslStartDir, { recursive: true });
            await writeFile(join(trayDir, ICON_FILE_NAME), icon);
            await writeFile(join(trayDir, TRAY_SCRIPT_NAME), '\uFEFF' + scripts.trayScript, 'utf8');
            await writeFile(join(trayDir, TRAY_VBS_NAME), scripts.trayVbs, 'utf8');
            await writeFile(join(wslStartDir, START_SCRIPT_NAME), scripts.startScript, 'utf8');
            await chmod(join(wslStartDir, START_SCRIPT_NAME), 0o755);
            const trayScriptWindowsPath = wslPathToWindowsPath(join(trayDir, TRAY_SCRIPT_NAME));
            const result = await runWindowsPowerShell(['-File', trayScriptWindowsPath, '-Regenerate'], undefined, 30000);
            if (result.code !== 0 || result.timedOut) {
                return {
                    ...(await this.status()),
                    ok: false,
                    lastError: result.timedOut
                        ? 'timed out while Windows created the shortcut (PowerShell interop did not answer)'
                        : `PowerShell failed to create the shortcut: ${result.stderr.trim() || result.stdout.trim() || `exit ${String(result.code)}`}`,
                };
            }
            const refreshed = await this.status();
            const lastResult = result.stdout.trim() || (refreshed.shortcutPath ?? 'shortcut created');
            return { ...refreshed, ok: refreshed.shortcutExists, lastResult };
        }
        catch (error) {
            this.ctx.logger?.warn(`[dsh-wsl-tray] regenerate failed: ${error instanceof Error ? error.message : String(error)}`);
            return {
                ...(await this.status()),
                ok: false,
                lastError: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
