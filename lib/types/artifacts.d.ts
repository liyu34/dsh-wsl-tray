/**
 * Generated artifact templates: the WSL-side start script and the Windows-side
 * tray helper. Both are plain text so they can be written without any Windows
 * process, then a short PowerShell invocation creates the .lnk shortcut.
 *
 * The tray helper also carries the WATCHDOG, which answers the three design
 * questions of this feature:
 *   1. How DSH liveness is judged: an HTTP probe of the web URL on a timer;
 *      `downThreshold` consecutive failed probes declare DSH down (each probe
 *      records its status code / error text so "refused", "timeout" and
 *      "bad status" stay distinguishable in the log).
 *   2. Restart success is known by the URL answering again within
 *      `restartWaitSec`; each unanswered window counts one failed restart, and
 *      after `maxRestartFailures` consecutive failures the watchdog PAUSES
 *      instead of restarting forever (resume from the tray menu, or it
 *      auto-resumes as soon as DSH answers again).
 *   3. Everything (probes, transitions, restart attempts, pause/resume) is
 *      appended to watchdog.log with timestamps and levels, and a compact
 *      watchdog-status.json is rewritten each tick for the host card.
 */
export declare const PLUGIN_ID = "dsh-wsl-tray";
export declare const WSL_DIR_NAME = "dsh-wsl-tray";
export declare const WIN_DIR_REL = ".dsh/dsh-wsl-tray";
export declare const TRAY_SCRIPT_NAME = "dsh-tray.ps1";
export declare const TRAY_VBS_NAME = "dsh-tray.vbs";
export declare const ICON_FILE_NAME = "dsh.ico";
export declare const START_SCRIPT_NAME = "start.sh";
export declare const WATCHDOG_LOG_NAME = "watchdog.log";
export declare const WATCHDOG_STATUS_NAME = "watchdog-status.json";
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
 * Baked-in watchdog tuning. The tray helper is generated text, so changing
 * these values only takes effect after a regenerate (the plugin's `ensure`
 * compares content and rewrites the tray helper when it differs).
 */
export interface WatchdogConfig {
    /** Master switch. */
    enabled: boolean;
    /** Seconds between probes. */
    probeIntervalSec: number;
    /** HTTP probe timeout per attempt. */
    probeTimeoutSec: number;
    /** Consecutive failed probes that declare DSH down. */
    downThreshold: number;
    /** Max seconds a restart may take before it counts as failed. */
    restartWaitSec: number;
    /** Give up (pause) after this many consecutive failed restart attempts. */
    maxRestartFailures: number;
    /** Cooldown between two failed restart attempts. */
    restartBackoffSec: number;
}
export declare const DEFAULT_WATCHDOG_CONFIG: WatchdogConfig;
/**
 * Build the WSL-side launcher. It starts the same DSH web CLI the running
 * plugin host came from, waits for readiness, and opens the default browser.
 */
export declare function buildStartScript(params: {
    nodeBin: string;
    sourceCli: string | null;
    sourceCwd: string | null;
    bakedCli: string | null;
    webUrl: string;
}): string;
/**
 * Build the Windows tray helper, including the watchdog state machine.
 *
 * Watchdog phases: `starting` (initial boot grace) → `probing` (steady state)
 * → `restarting` (after a restart trigger, waiting for DSH to answer) →
 * `backoff` (cooldown after a failed restart) or `paused` (auto-give-up after
 * `maxRestartFailures`, or user pause). Any phase returns to `probing` the
 * moment DSH answers again.
 * @param config - launch facts baked into the script.
 * @param watchdog - watchdog tuning baked into the script (defaults when omitted).
 */
export declare function buildTrayScript(config: LaunchConfig, watchdog?: WatchdogConfig): string;
/**
 * Build the Windows-side hidden launcher for the tray helper. The shortcut
 * points at wscript.exe (a GUI-subsystem host, no console) and passes this
 * script; the script derives the PowerShell path from its own location and
 * starts the tray helper with window style 0.
 */
export declare function buildTrayVbs(): string;
