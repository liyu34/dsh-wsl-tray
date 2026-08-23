# dsh-wsl-tray

[中文](README.zh.md) | English

A DeepSeek Harness plugin for WSL deployments: it puts a Windows desktop
shortcut and a system-tray launcher in front of the DSH web server running
inside WSL.

## Features

- Double-click the **DeepSeek Harness** desktop shortcut to start DSH in the
  background (or reuse an already-running instance). The default browser opens
  exactly once when DSH is ready (the built-in DSH browser-open is disabled by
  `--no-open`; only the tray opens it).
- A DSH fish tray icon appears. Right-click menu:
  - 打开 DeepSeek Harness / open the DSH web page
  - 重新生成桌面快捷方式 / recreate the desktop shortcut
  - 重启 DSH 服务 / restart the DSH service
  - 暂停守护进程 / 恢复守护进程 / pause or resume the watchdog
  - 退出 / exit the tray icon
- **Double-clicking the tray icon** also opens the DSH web page.
- **A watchdog daemon runs inside the tray**: it probes the DSH URL on a
  timer, restarts DSH when the probes fail, gives up after a bounded number of
  consecutive failed restarts, and writes a full audit trail to
  `watchdog.log` (see [Watchdog](#watchdog) below).
- The plugin-configuration card shows live status (tray files + watchdog
  state) and a button that recreates the desktop shortcut without touching
  WSL by hand. The card can also show the tail of the watchdog log.
- No console window is shown: the shortcut goes through `wscript.exe` + VBS and
  the entire chain is launched with window style 0.

## Requirements

- DSH itself must be running inside WSL (`WSL_DISTRO_NAME` set, `/mnt/c`
  accessible).
- Windows must be able to run `wscript.exe`, `powershell.exe`, and `wsl.exe`.
- DSH web 0.1.0-rc.7 or newer (settings cards + client bundle machinery).

## Install

Once published to npm:

```sh
dsh plugin --profile web add dsh-wsl-tray
```

Or add it manually to a DSH web profile:

```sh
cd ~/.dsh/profiles/web
pnpm add dsh-wsl-tray
```

and add `"dsh-wsl-tray"` to `package.json`:

```json
"dsh": {
  "profile": {
    "bundles": [
      "@deepseek-ai/dsh-base",
      "@deepseek-ai/dsh-web-app",
      "dsh-wsl-tray"
    ]
  }
}
```

Restart `dsh web` and open **Settings → Plugins → Plugin configuration** to see
the **WSL 桌面与托盘** card.

## Generated files

The plugin writes four generated files:

| File | Location |
|---|---|
| `dsh.ico` | `%USERPROFILE%\.dsh\dsh-wsl-tray\dsh.ico` |
| `dsh-tray.ps1` | `%USERPROFILE%\.dsh\dsh-wsl-tray\dsh-tray.ps1` |
| `dsh-tray.vbs` | `%USERPROFILE%\.dsh\dsh-wsl-tray\dsh-tray.vbs` |
| `start.sh` | `~/.dsh/dsh-wsl-tray/start.sh` |

and creates:

```
%USERPROFILE%\Desktop\DeepSeek Harness.lnk
```

While the tray runs, the watchdog maintains two runtime files (both are shown
on the config card):

| File | Location |
|---|---|
| `watchdog.log` | `%USERPROFILE%\.dsh\dsh-wsl-tray\watchdog.log` (rotated at 512 KB) |
| `watchdog-status.json` | `%USERPROFILE%\.dsh\dsh-wsl-tray\watchdog-status.json` (latest tick) |

The shortcut points at `wscript.exe`, which runs `dsh-tray.vbs`; the VBS starts
the tray PowerShell hidden, and the tray starts `start.sh` inside WSL through
`WScript.Shell.Run(..., 0, false)`.

## Watchdog

The watchdog lives inside the tray helper (the one process that is deliberately
independent of DSH), and answers the three questions a restart daemon has to:

1. **How liveness is judged** — an HTTP `Invoke-WebRequest` probe of the DSH
   web URL every `probeIntervalSec` (default 10 s, probe timeout 3 s). Each
   probe records its status code or error text, so a *refused* connection
   (nothing listening), a *timeout* (hung server) and a *bad status* stay
   distinguishable in the log. DSH is only considered DOWN after
   `downThreshold` (3) consecutive failed probes.
2. **Restart success & giving up** — a restart is triggered (stop + start via
   `wsl.exe`) and the watchdog waits up to `restartWaitSec` (180 s) for the URL
   to answer again: an answer = success, which resets the failure counter; an
   unanswered window = one failed restart. After `maxRestartFailures` (3)
   consecutive failures the watchdog **pauses** instead of looping forever. It
   resumes from the tray menu (`恢复守护进程`), or automatically as soon as DSH
   answers again.
3. **Logging** — every probe transition, restart trigger, success/failure and
   pause/resume is appended to `watchdog.log` with a timestamp, level and the
   probe detail; the current state machine snapshot goes to
   `watchdog-status.json` every tick. The plugin card exposes both through
   `/dsh-wsl-tray/watchdog` and `/dsh-wsl-tray/watchdog-log`.

Phases: `starting` (initial boot grace) → `probing` (steady state) →
`restarting` (waiting after a restart) → `backoff` (cooldown) or `paused`
(give-up / manual pause). The tuning values above are baked into
`dsh-tray.ps1`; change them in `src/artifacts.ts`
(`DEFAULT_WATCHDOG_CONFIG`) and regenerate.

## Install without npm publishing

If npm publishing is not an option, install the prebuilt tarball that is
included in this repository:

```sh
cd ~/.dsh/profiles/web
pnpm add /path/to/dsh-wsl-tray-github/dist/dsh-wsl-tray-0.1.4.tgz
```

Then add `"dsh-wsl-tray"` to the profile bundle list as above.

## How it works

1. **Hidden launch**: shortcut → `wscript.exe` → VBS → hidden PowerShell tray.
2. **DSH stays alive**: `start.sh` runs DSH in the **foreground** of the hidden
   `wsl.exe` session, so WSL does not recycle the process after the one-shot
   launcher exits.
3. **Automatic browser open**: a Windows-side timer in the tray polls the DSH
   URL every 2 seconds and calls `Start-Process $webUrl` once DSH answers.
4. **Watchdog**: a second tray timer probes the URL every 10 seconds and runs
   the state machine described above.
5. **Regeneration**: the config card and the tray menu both run
   `dsh-tray.ps1 -Regenerate`.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

## Known limitations

- Only enabled inside WSL; on non-WSL hosts the card reports that the feature
  is unavailable.
- The watchdog runs only while the tray icon is up: choosing 退出 stops both
  the tray and the watchdog. Add the shortcut to the Windows Startup folder
  if you want the watchdog to follow Windows boot.
- “退出” only exits the tray icon; it does not stop the already-started DSH
  background process (use Windows Task Manager or `wsl --shutdown`).
