/**
 * WSL/Windows interop helpers. Every Windows process launch carries a timeout:
 * the plugin must never hang the DSH server when WSL interop is unavailable.
 */
import { execFile, spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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
export function runWindowsPowerShell(args, script, timeoutMs = 20000) {
    return new Promise((resolve) => {
        const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', ...args], {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
        });
        let stdout = '';
        let stderr = '';
        let settled = false;
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill('SIGKILL');
        }, timeoutMs);
        timer.unref?.();
        const finish = (result) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            resolve(result);
        };
        child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        child.on('error', (error) => {
            finish({ code: null, signal: null, stdout, stderr: stderr === '' ? error.message : stderr, timedOut });
        });
        child.on('close', (code, signal) => {
            finish({ code, signal, stdout, stderr, timedOut });
        });
        if (script !== undefined) {
            child.stdin.on('error', () => { });
            child.stdin.end(script);
        }
        else {
            child.stdin.end();
        }
    });
}
/** Whether the host is running inside WSL. */
export function isWsl() {
    if (process.env.WSL_DISTRO_NAME !== undefined && process.env.WSL_DISTRO_NAME !== '')
        return true;
    try {
        return readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');
    }
    catch {
        return false;
    }
}
/** The WSL distro name for `wsl.exe -d <distro>`. */
export function distroName() {
    return process.env.WSL_DISTRO_NAME || 'Ubuntu';
}
/**
 * Best-effort WSL-side path of the Windows user profile. It is derived from
 * the interop PATH (`/mnt/c/Users/Administrator/...`) so it works even when
 * PowerShell interop is unavailable; null means the drive mapping could not
 * be inferred.
 */
export function windowsUserProfileWslPath(envPath = process.env.PATH ?? '') {
    for (const entry of envPath.split(':')) {
        const match = /^\/mnt\/([a-zA-Z])\/Users\/([^/]+)/.exec(entry);
        if (match !== null)
            return `/mnt/${match[1].toLowerCase()}/Users/${match[2]}`;
    }
    return null;
}
/**
 * Convert a Windows path to a WSL path with `wslpath -u` (a Linux binary, so
 * no Windows process is involved). Returns null on failure.
 */
export async function windowsPathToWslPath(windowsPath) {
    const trimmed = windowsPath.trim().replace(/"/g, '');
    if (trimmed === '')
        return null;
    return new Promise((resolve) => {
        execFile('wslpath', ['-u', windowsPath], { timeout: 5000 }, (error, stdout) => {
            if (error !== null) {
                resolve(null);
                return;
            }
            const line = stdout.trim();
            resolve(line === '' ? null : line);
        });
    });
}
/**
 * WSL-side path of the Windows desktop. Uses PowerShell's authoritative
 * `GetFolderPath('Desktop')` (which follows OneDrive redirection) and falls
 * back to the conventional profile/Desktop, then profile/OneDrive/Desktop.
 */
export async function windowsDesktopWslPath() {
    const profile = windowsUserProfileWslPath() ?? fallbackWindowsProfileWslPath();
    if (isWsl()) {
        const result = await runWindowsPowerShell(['-Command', "[Environment]::GetFolderPath('Desktop')"], undefined, 8000);
        if (result.code === 0 && !result.timedOut && result.stdout.trim() !== '') {
            const converted = await windowsPathToWslPath(result.stdout.trim());
            if (converted !== null)
                return converted;
        }
    }
    if (profile === null)
        return null;
    const direct = join(profile, 'Desktop');
    if (existsSync(direct))
        return direct;
    const oneDrive = join(profile, 'OneDrive', 'Desktop');
    if (existsSync(oneDrive))
        return oneDrive;
    return direct;
}
/** Pick a single plausible Windows user profile when the PATH probe failed. */
export function fallbackWindowsProfileWslPath() {
    const base = '/mnt/c/Users';
    try {
        const entries = readdirSync(base).filter(name => !['Public', 'Default', 'Default User', 'All Users', 'desktop.ini'].includes(name));
        return entries.length > 0 ? join(base, entries[0]) : null;
    }
    catch {
        return null;
    }
}
