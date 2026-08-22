import { describe, expect, it } from 'vitest'
import { buildStartScript, buildTrayScript, buildTrayVbs } from '../src/artifacts.ts'
import { wslPathToWindowsPath, webUrlFor } from '../src/service.ts'

describe('generated scripts', () => {
  it('bakes the launch facts into the WSL start script', () => {
    const script = buildStartScript({
      nodeBin: '/usr/bin/node',
      cliBin: '/home/me/deepseek-harness/apps/cli/lib/bin.js',
      cwd: '/home/me/deepseek-harness',
      webUrl: 'http://127.0.0.1:3080',
    })
    expect(script).toContain('URL="http://127.0.0.1:3080"')
    expect(script).toContain('CLI="/home/me/deepseek-harness/apps/cli/lib/bin.js"')
    expect(script).toContain('exec "$NODE" "$CLI" web --no-open')
  })

  it('builds the hidden wscript launcher next to the tray script', () => {
    const vbs = buildTrayVbs()
    expect(vbs).toContain('CreateObject("WScript.Shell")')
    expect(vbs).toContain('dsh-tray.ps1')
    expect(vbs).toContain('0, False')
  })

  it('bakes the tray config and exposes a -Regenerate-only mode', () => {
    const script = buildTrayScript({
      distro: 'Ubuntu',
      webUrl: 'http://127.0.0.1:3080',
      shortcutName: 'DeepSeek Harness',
      wslStartScript: '~/.dsh/dsh-wsl-tray/start.sh',
    })
    expect(script).toContain('$shortcutName = "DeepSeek Harness"')
    expect(script).toContain('if ($Regenerate) {')
    expect(script).toContain('function Start-DshWsl')
    expect(script).toContain('重启 DSH 服务')
    expect(script).toContain('function Restart-Dsh')
    expect(script).toContain("$shortcut.TargetPath = 'C:\\Windows\\System32\\wscript.exe'")
  })
})

describe('path and URL helpers', () => {
  it('maps /mnt/c paths to Windows drive-letter paths', () => {
    expect(wslPathToWindowsPath('/mnt/c/Users/A/.dsh/x.ps1')).toBe('C:\\Users\\A\\.dsh\\x.ps1')
  })

  it('uses loopback for a webserver bound to all interfaces', () => {
    expect(webUrlFor({ host: '0.0.0.0', port: 3080 })).toBe('http://127.0.0.1:3080')
    expect(webUrlFor({ host: '127.0.0.1', port: 9090 })).toBe('http://127.0.0.1:9090')
  })
})
