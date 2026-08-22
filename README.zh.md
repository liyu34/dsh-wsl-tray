# dsh-wsl-tray

中文 | [English](README.md)

为运行在 WSL 里的 DeepSeek Harness（DSH）提供 Windows 桌面快捷方式与系统托盘启动器。

- 双击桌面 **DeepSeek Harness** 快捷方式：DSH 会在 WSL 后台启动（或复用已运行的实例），稍后浏览器自动打开（只打开一个标签页）。
- 启动后出现 DSH 鱼形托盘图标，右键菜单：
  - 打开 DeepSeek Harness
  - 重新生成桌面快捷方式
  - 重启 DSH 服务
  - 退出托盘
- **双击托盘图标**也会直接打开 DSH 网页。
- 插件配置页的 “WSL 桌面与托盘” 卡片可以查看状态，并一键重新生成桌面快捷方式。
- 全程无控制台窗口：快捷方式通过 `wscript.exe` + VBS 完全隐藏启动。

## 环境要求

- DSH 本身运行在 WSL 中（`WSL_DISTRO_NAME` 已设置，或 `/mnt/c` 可访问）。
- Windows 侧可执行 `wscript.exe` / `powershell.exe` / `wsl.exe`。
- DSH web 0.1.0-rc.7 或更新版本（插件配置页 + 客户端 bundle 机制）。

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

重启 `dsh web`，然后打开 **设置 → 插件 → 插件配置**，即可看到 “WSL 桌面与托盘”。

## 生成的文件

插件会在以下位置写入四个生成文件：

| 文件 | 位置 |
|---|---|
| `dsh.ico` | `%USERPROFILE%\.dsh\dsh-wsl-tray\dsh.ico` |
| `dsh-tray.ps1` | `%USERPROFILE%\.dsh\dsh-wsl-tray\dsh-tray.ps1` |
| `dsh-tray.vbs` | `%USERPROFILE%\.dsh\dsh-wsl-tray\dsh-tray.vbs` |
| `start.sh` | `~/.dsh/dsh-wsl-tray/start.sh` |

并创建：

```
%USERPROFILE%\Desktop\DeepSeek Harness.lnk
```

快捷方式指向 `wscript.exe`，通过 `dsh-tray.vbs` 隐藏启动托盘 PowerShell；托盘再通过
`WScript.Shell.Run(..., 0, false)` 隐藏启动 WSL 中的 `start.sh`。


## 不发布 npm 的安装方式

如果暂时不想注册 npm 账号，仓库里已生成可直接安装的 tarball：

```sh
pnpm add /path/to/dsh-wsl-tray/dist/dsh-wsl-tray-0.1.0.tgz
```

然后按上面的方式把 `"dsh-wsl-tray"` 加入 profile 的 `dsh.profile.bundles`。

## 工作原理

1. **隐藏启动**：快捷方式 -> `wscript.exe` -> VBS -> 隐藏 PowerShell 托盘。
2. **DSH 保活**：`start.sh` 让 DSH 在隐藏 `wsl.exe` 会话中**前台运行**，因此 WSL 不会在
   一次性启动器退出后回收进程。
3. **自动开网页**：托盘脚本里的 Windows 定时器每 2 秒探测 DSH URL，一旦就绪就用
   `Start-Process $webUrl` 打开默认浏览器。
4. **重新生成**：配置卡片和托盘菜单都调用同一个 `dsh-tray.ps1 -Regenerate` 逻辑。

## 开发

```sh
npm install
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

## 已知限制

- 仅在 WSL 环境中启用；非 WSL 环境配置卡片会提示不可用。
- 托盘“退出”只退出托盘图标，不会停止已经启动的 DSH 后台进程（可通过 Windows 任务管理器或
  `wsl --shutdown` 停止）。
