/**
 * The WSL desktop/tray launcher service: writes the three generated artifacts
 * (icon, Windows tray helper, WSL start script) and creates the desktop
 * shortcut through a single PowerShell `-Regenerate` run.
 */
/** Stable wire shape shared by the status and regenerate routes. */
export interface TrayStatus {
    ok: boolean;
    wsl: boolean;
    distro: string;
    webUrl: string;
    shortcutName: string;
    windowsProfileDir: string | null;
    desktopDir: string | null;
    shortcutPath: string | null;
    shortcutExists: boolean;
    trayDir: string | null;
    trayScriptExists: boolean;
    trayVbsExists: boolean;
    iconExists: boolean;
    startScriptPath: string;
    startScriptExists: boolean;
    lastError?: string;
    lastResult?: string;
}
/** The webserver face the service reads for the current URL. */
export interface WebServerLike {
    readonly host: string;
    readonly port: number;
}
/** The context face this service needs. */
export interface TrayServiceContext {
    readonly logger?: {
        warn(message: string): void;
        info(message: string): void;
    };
}
/** Convert a WSL `/mnt/c/...` path to the Windows `C:\...` form. */
export declare function wslPathToWindowsPath(path: string): string;
/** The DSH web URL for a bound webserver host/port. */
export declare function webUrlFor(webServer: WebServerLike): string;
/** The WSL-side directory holding the generated start script. */
export declare function wslAppDir(): string;
/**
 * Owns the generated files and the shortcut lifecycle for one plugin mount.
 * All Windows process launches are fenced by the helpers in windows.ts.
 */
export declare class TrayService {
    private readonly ctx;
    private readonly webServer;
    private readonly shortcutName;
    private cachedDesktopDir;
    constructor(ctx: TrayServiceContext, webServer: WebServerLike, shortcutName?: string);
    /** The Windows-side directory holding the icon and tray script. */
    private windowsAppDir;
    /** Resolve the desktop once per mount; PowerShell is authoritative. */
    desktopDir(): Promise<string | null>;
    /** Read the current on-disk facts. */
    status(): Promise<TrayStatus>;
    /**
     * Build the two text artifacts for the current host facts. Null when the
     * DSH web CLI cannot be located (regenerate reports that as an error).
     */
    private currentScripts;
    /**
     * Ensure the four generated files exist AND match the current host facts
     * (web URL, CLI path, shortcut name). A stale start script from another
     * port/profile is a real failure mode, so compare content, not presence.
     */
    ensure(): Promise<TrayStatus>;
    /** Write all artifacts and create/refresh the desktop shortcut. */
    regenerate(): Promise<TrayStatus>;
}
