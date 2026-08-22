/**
 * WSL/Windows interop helpers. Every Windows process launch carries a timeout:
 * the plugin must never hang the DSH server when WSL interop is unavailable.
 */
/** Result of a Windows process launch. */
export interface ExecResult {
    /** Exit code, or null when the process was terminated by a signal/timeout. */
    code: number | null;
    /** Signal that terminated the process, when one did. */
    signal: NodeJS.Signals | null;
    stdout: string;
    stderr: string;
    /** Whether the configured timeout killed the process. */
    timedOut: boolean;
}
/**
 * Run a Windows PowerShell process from WSL through the interop launcher.
 * The returned promise always settles: a timeout kills the child and resolves
 * with {@link ExecResult.timedOut} set, and a spawn error resolves as a
 * failed result so callers can degrade gracefully.
 * @param args - arguments after the common `-NoProfile`/`-NonInteractive` set.
 * @param script - optional PowerShell source written to the child's stdin
 * (`powershell.exe -Command -`).
 * @param timeoutMs - hard kill deadline.
 */
export declare function runWindowsPowerShell(args: readonly string[], script?: string, timeoutMs?: number): Promise<ExecResult>;
/** Whether the host is running inside WSL. */
export declare function isWsl(): boolean;
/** The WSL distro name for `wsl.exe -d <distro>`. */
export declare function distroName(): string;
/**
 * Best-effort WSL-side path of the Windows user profile. It is derived from
 * the interop PATH (`/mnt/c/Users/Administrator/...`) so it works even when
 * PowerShell interop is unavailable; null means the drive mapping could not
 * be inferred.
 */
export declare function windowsUserProfileWslPath(envPath?: string): string | null;
/**
 * Convert a Windows path to a WSL path with `wslpath -u` (a Linux binary, so
 * no Windows process is involved). Returns null on failure.
 */
export declare function windowsPathToWslPath(windowsPath: string): Promise<string | null>;
/**
 * WSL-side path of the Windows desktop. Uses PowerShell's authoritative
 * `GetFolderPath('Desktop')` (which follows OneDrive redirection) and falls
 * back to the conventional profile/Desktop, then profile/OneDrive/Desktop.
 */
export declare function windowsDesktopWslPath(): Promise<string | null>;
/** Pick a single plausible Windows user profile when the PATH probe failed. */
export declare function fallbackWindowsProfileWslPath(): string | null;
