# dsh-wsl-tray

中文 | [English](README.md)

为运行在 WSL 里的 DeepSeek Harness（DSH）提供 Windows 桌面快捷方式与系统托盘启动器。

- 双击桌面 **DeepSeek Harness** 快捷方式：DSH 会在 WSL 后台启动（或复用已运行的实例），稍后浏览器自动打开（只打开一个标签页）。
- 启动后出现 DSH 鱼形托盘图标，右键菜单：
  - 打开 DeepSeek Harness
  - 重新生成桌面快捷方式
  - 重启 DSH 服务
  - 暂停守护进程 / 恢复守护进程
  - 退出托盘
- **双击托盘图标**也会直接打开 DSH 网页。
- **托盘内置守护进程**：定时探测 DSH 网址，探测失败即自动重启 DSH，连续失败到上限后
  停止自动重启，并把全过程写入 `watchdog.log`（详见下文「守护进程」）。
- 插件在设置里拥有独立页面（**设置 → WSL 桌面与托盘**）：查看状态（托盘文件 + 守护
  进程状态），一键重新生成桌面快捷方式，还可以直接查看守护日志。
- 全程无控制台窗口：快捷方式通过 `wscript.exe` + VBS 完全隐藏启动。

## 环境要求

- DSH 本身运行在 WSL 中（`WSL_DISTRO_NAME` 已设置，或 `/mnt/c` 可访问）。
- Windows 侧可执行 `wscript.exe` / `powershell.exe` / `wsl.exe`。
- DSH web 0.1.7-alpha.2 或更新版本（客户端设置分区 + 客户端 bundle 机制）。

## 安装

发布到 npm 后，在 DSH web profile 中执行：

```sh
dsh plugin --profile web add dsh-wsl-tray
```

或手动加入 profile：

```sh
cd ~/.dsh/profiles/web
pnpm add dsh-wsl-tray
```

并把 `"dsh-wsl-tray"` 加入 `package.json` 的：

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

重启 `dsh web`，然后打开 **设置 → WSL 桌面与托盘** 即可看到该页面。

## 生成的文件

插件会在以下位置写入五个生成文件：

| 文件 | 位置 |
|---|---|
| `dsh.ico` | `%USERPROFILE%\.dsh\dsh-wsl-tray\dsh.ico` |
| `dsh-tray.ps1` | `%USERPROFILE%\.dsh\dsh-wsl-tray\dsh-tray.ps1` |
| `dsh-tray.vbs` | `%USERPROFILE%\.dsh\dsh-wsl-tray\dsh-tray.vbs` |
| `start.sh` | `~/.dsh/dsh-wsl-tray/start.sh` |
| `stop.sh` | `~/.dsh/dsh-wsl-tray/stop.sh` |

并创建：

```
%USERPROFILE%\Desktop\DeepSeek Harness.lnk
```

托盘运行期间，守护进程会维护两个运行期文件（设置页面上都能看到）：

| 文件 | 位置 |
|---|---|
| `watchdog.log` | `%USERPROFILE%\.dsh\dsh-wsl-tray\watchdog.log`（512KB 自动滚动） |
| `watchdog-status.json` | `%USERPROFILE%\.dsh\dsh-wsl-tray\watchdog-status.json`（每次探测更新） |

快捷方式指向 `wscript.exe`，通过 `dsh-tray.vbs` 隐藏启动托盘 PowerShell；托盘再通过
`WScript.Shell.Run(..., 0, false)` 隐藏启动 WSL 中的 `start.sh`。

## 守护进程

守护进程放在托盘里运行（托盘是唯一刻意独立于 DSH 的常驻进程），它回答了重启守护的
三个核心问题：

1. **如何判断 DSH 运行状态**：每 `probeIntervalSec`（默认 10 秒）对 DSH 网址做一次
   `Invoke-WebRequest` HTTP 探测（超时 3 秒）。每次探测都会记录状态码或错误文本，
   因此「连接被拒（无进程监听）」「超时（服务器卡死）」「异常状态码」在日志里是可以
   区分的。连续 `downThreshold`（3）次探测失败才会判定 DSH 失活。
2. **重启是否成功与放弃**：触发一次重启（通过 `wsl.exe` 停止再启动）后，等待
   `restartWaitSec`（180 秒）内网址重新有响应：有响应 = 重启成功，失败计数清零；
   窗口内没响应 = 本次重启失败。连续 `maxRestartFailures`（3）次失败后守护进程
   **暂停自动重启**，不再无限重试。可通过托盘菜单「恢复守护进程」手动恢复，DSH
   一旦恢复响应也会自动恢复。
3. **日志**：每次探测、状态迁移、重启触发、成功/失败、暂停/恢复都会带时间戳和
   级别追加到 `watchdog.log`；当前状态机快照每次探测写入 `watchdog-status.json`。
   设置页面通过 `/dsh-wsl-tray/watchdog` 和 `/dsh-wsl-tray/watchdog-log` 暴露它们。

状态机：`starting`（启动宽限期）→ `probing`（稳态探测）→ `restarting`（重启后等待）
→ `backoff`（冷却）或 `paused`（放弃/手动暂停）。上面的调参值烘焙在生成的
`dsh-tray.ps1` 里；改 `src/artifacts.ts` 的 `DEFAULT_WATCHDOG_CONFIG` 后重新生成即可。

## 不发布 npm 的安装方式

如果暂时不想注册 npm 账号，可以直接安装仓库里已生成的预构建 tarball：

```sh
cd ~/.dsh/profiles/web
pnpm add /path/to/dsh-wsl-tray-github/dist/dsh-wsl-tray-0.1.6.tgz
```

然后按上面的方式把 `"dsh-wsl-tray"` 加入 profile 的 `dsh.profile.bundles`。

## 工作原理

1. **隐藏启动**：快捷方式 -> `wscript.exe` -> VBS -> 隐藏 PowerShell 托盘。
2. **DSH 保活**：`start.sh` 让 DSH 在隐藏 `wsl.exe` 会话中**前台运行**，因此 WSL 不会在
   一次性启动器退出后回收进程。
3. **自动开网页**：托盘脚本里的 Windows 定时器每 2 秒探测 DSH URL，一旦就绪就用
   `Start-Process $webUrl` 打开默认浏览器。
4. **守护进程**：第二个定时器每 10 秒探测 URL，按上面描述的状态机自动重启。
5. **重新生成**：设置页面和托盘菜单都调用同一个 `dsh-tray.ps1 -Regenerate` 逻辑。

## 开发

```sh
npm install
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

## 已知限制

- 仅在 WSL 环境中启用；非 WSL 环境设置页面会提示不可用。
- 守护进程只在托盘运行时有效：选择「退出」会通过生成的 `stop.sh` 同时停止守护进程和
  它启动的 DSH 实例（PID 文件精确跟踪 `start.sh` 启动的实例，另有模式兜底覆盖源码、
  npm 全局、npx 三种 `bin.js web` 启动方式）。若希望开机后就有守护，可把快捷方式加入
  Windows 启动文件夹。
- 用其他方式（不同参数、别的工具）启动的 DSH web 实例不被 PID 文件跟踪；若模式兜底
  没有命中，请手动停止（Windows 任务管理器或 `wsl --shutdown`）。
