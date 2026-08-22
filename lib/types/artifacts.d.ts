/**
 * Generated artifact templates: the WSL-side start script and the Windows-side
 * tray helper. Both are plain text so they can be written without any Windows
 * process, then a short PowerShell invocation creates the .lnk shortcut.
 */
export declare const PLUGIN_ID = "dsh-wsl-tray";
export declare const WSL_DIR_NAME = "dsh-wsl-tray";
export declare const WIN_DIR_REL = ".dsh/dsh-wsl-tray";
export declare const TRAY_SCRIPT_NAME = "dsh-tray.ps1";
export declare const TRAY_VBS_NAME = "dsh-tray.vbs";
export declare const ICON_FILE_NAME = "dsh.ico";
export declare const START_SCRIPT_NAME = "start.sh";
export declare const DEFAULT_SHORTCUT_NAME = "DeepSeek Harness";
export declare const DEFAULT_WEB_URL = "http://127.0.0.1:3080";
/** Parameters baked into both generated scripts. */
export interface LaunchConfig {
    /** WSL distro name passed to `wsl.exe -d`. */
    distro: string;
    /** DSH web URL the tray opens and the start script polls. */
    webUrl: string;
    /** Shortcut display name (without the .lnk suffix). */
    shortcutName: string;
    /** WSL-side path of the generated start script. */
    wslStartScript: string;
}
/**
 * Build the WSL-side launcher. It starts the same DSH web CLI the running
 * plugin host came from, waits for readiness, and opens the default browser.
 */
export declare function buildStartScript(params: {
    nodeBin: string;
    cliBin: string;
    cwd: string;
    webUrl: string;
}): string;
export declare function buildTrayScript(config: LaunchConfig): string;
/**
 * Build the Windows-side hidden launcher for the tray helper. The shortcut
 * points at wscript.exe (a GUI-subsystem host, no console) and passes this
 * script; the script derives the PowerShell path from its own location and
 * starts the tray helper with window style 0.
 */
export declare function buildTrayVbs(): string;
