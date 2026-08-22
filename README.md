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
  - 退出 / exit the tray icon
- **Double-clicking the tray icon** also opens the DSH web page.
- The plugin-configuration card shows live status and a button that recreates
  the desktop shortcut without touching WSL by hand.
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

The shortcut points at `wscript.exe`, which runs `dsh-tray.vbs`; the VBS starts
the tray PowerShell hidden, and the tray starts `start.sh` inside WSL through
`WScript.Shell.Run(..., 0, false)`.


## Install without npm publishing

If npm publishing is not an option, install the prebuilt tarball that is
included in this repository:

```sh
cd ~/.dsh/profiles/web
pnpm add /path/to/dsh-wsl-tray-github/dist/dsh-wsl-tray-0.1.2.tgz
```

Then add `"dsh-wsl-tray"` to the profile bundle list as above.

## How it works

1. **Hidden launch**: shortcut → `wscript.exe` → VBS → hidden PowerShell tray.
2. **DSH stays alive**: `start.sh` runs DSH in the **foreground** of the hidden
   `wsl.exe` session, so WSL does not recycle the process after the one-shot
   launcher exits.
3. **Automatic browser open**: a Windows-side timer in the tray polls the DSH
   URL every 2 seconds and calls `Start-Process $webUrl` once DSH answers.
4. **Regeneration**: the config card and the tray menu both run
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
- “退出” only exits the tray icon; it does not stop the already-started DSH
  background process (use Windows Task Manager or `wsl --shutdown`).
