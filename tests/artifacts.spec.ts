import { describe, expect, it } from 'vitest'
import { buildStartScript, buildStopScript, buildTrayScript, buildTrayVbs, DEFAULT_WATCHDOG_CONFIG, WATCHDOG_LOG_NAME, WATCHDOG_STATUS_NAME } from '../src/artifacts.ts'
import { configuredPathProblem, sourceBuildProblem, wslPathToWindowsPath, webUrlFor, type StartCommand } from '../src/service.ts'

function trayScript(): string {
  return buildTrayScript({
    distro: 'Ubuntu',
    webUrl: 'http://127.0.0.1:3080',
    shortcutName: 'DeepSeek Harness',
    wslStartScript: '~/.dsh/dsh-wsl-tray/start.sh',
    wslStopScript: '~/.dsh/dsh-wsl-tray/stop.sh',
  })
}

describe('generated scripts', () => {
  it('bakes the launch facts into the WSL start script', () => {
    const script = buildStartScript({
      nodeBin: '/usr/bin/node',
      sourceCli: '/home/me/deepseek-harness/apps/cli/lib/bin.js',
      sourceCwd: '/home/me/deepseek-harness',
      bakedCli: null,
      webUrl: 'http://127.0.0.1:3080',
    })
    expect(script).toContain('URL="http://127.0.0.1:3080"')
    expect(script).toContain('SOURCE_CLI="/home/me/deepseek-harness/apps/cli/lib/bin.js"')
    expect(script).toContain('exec "$NODE" "$SOURCE_CLI" web --no-open')
    expect(script).toContain('command -v dsh')
    expect(script).toContain('npx --yes dsh web --no-open')
  })

  it('tracks the launched PID and probes without curl when it is absent', () => {
    const script = buildStartScript({
      nodeBin: '/usr/bin/node',
      sourceCli: null,
      sourceCwd: null,
      bakedCli: null,
      webUrl: 'http://127.0.0.1:3080',
    })
    // PID file written before exec: exec keeps the shell PID, so stop.sh can
    // stop exactly the instance this script launched.
    expect(script).toContain('PID_FILE="$HOME/.dsh/dsh-wsl-tray/dsh.pid"')
    expect(script).toContain('echo $$ > "$PID_FILE"')
    // Dependency chain so a minimal distro still detects a live DSH.
    expect(script).toContain('command -v curl')
    expect(script).toContain('command -v wget')
    expect(script).toContain('/dev/tcp/$host/$port')
  })

  it('generates a stop script whose pkill cannot match its own wrapper', () => {
    const stop = buildStopScript()
    expect(stop).toContain('PID_FILE="$HOME/.dsh/dsh-wsl-tray/dsh.pid"')
    expect(stop).toContain('kill -0 "$pid"')
    // The bracketed class means the literal pattern text in the wsl.exe/bash
    // command line never matches the regex.
    expect(stop).toContain("pkill -f '[b]in\\.js web'")
    expect(new RegExp('[b]in\\.js web').test('[b]in\\.js web')).toBe(false)
    expect(new RegExp('[b]in\\.js web').test('node /x/apps/cli/lib/bin.js web --no-open')).toBe(true)
    expect(new RegExp('[b]in\\.js web').test('node /x/.npm-global/lib/node_modules/@deepseek-ai/dsh/lib/bin.js web --no-open')).toBe(true)
  })

  it('builds the hidden wscript launcher next to the tray script', () => {
    const vbs = buildTrayVbs()
    expect(vbs).toContain('CreateObject("WScript.Shell")')
    expect(vbs).toContain('dsh-tray.ps1')
    expect(vbs).toContain('0, False')
  })

  it('bakes the tray config and exposes a -Regenerate-only mode', () => {
    const script = trayScript()
    // Baked values use PowerShell single quotes (JSON escaping is not PS escaping).
    expect(script).toContain("$shortcutName = 'DeepSeek Harness'")
    expect(script).toContain("$wslStartScript = '~/.dsh/dsh-wsl-tray/start.sh'")
    expect(script).toContain("$wslStopScript = '~/.dsh/dsh-wsl-tray/stop.sh'")
    expect(script).toContain('if ($Regenerate) {')
    expect(script).toContain('function Start-DshWsl')
    expect(script).toContain('重启 DSH 服务')
    expect(script).toContain('function Restart-Dsh')
    expect(script).toContain("$shortcut.TargetPath = 'C:\\Windows\\System32\\wscript.exe'")
    // Stop/start go through stop.sh; the inline pkill (which used to match its
    // own wsl.exe/bash wrapper) is gone.
    expect(script).toContain("bash ' + $wslStopScript")
    expect(script).not.toContain("pkill -f 'apps/cli/lib/bin.js web'")
  })

  it('escapes single quotes in baked PowerShell values', () => {
    const script = buildTrayScript({
      distro: 'Ubuntu',
      webUrl: 'http://127.0.0.1:3080',
      shortcutName: "Tray's Harness",
      wslStartScript: '~/.dsh/dsh-wsl-tray/start.sh',
      wslStopScript: '~/.dsh/dsh-wsl-tray/stop.sh',
    })
    // '' doubling is the PowerShell single-quote escape; without it a quote
    // in a value would terminate the baked string.
    expect(script).toContain("$shortcutName = 'Tray''s Harness'")
  })

  it('bakes the watchdog state machine and its tuning into the tray script', () => {
    const script = trayScript()
    // Master switch + tuning literals (regenerate to change).
    expect(script).toContain('$watchdogEnabled = $true')
    expect(script).toContain(`$probeIntervalSec = ${DEFAULT_WATCHDOG_CONFIG.probeIntervalSec}`)
    expect(script).toContain(`$maxRestartFailures = ${DEFAULT_WATCHDOG_CONFIG.maxRestartFailures}`)
    expect(script).toContain(`$downThreshold = ${DEFAULT_WATCHDOG_CONFIG.downThreshold}`)
    // Liveness probe: HTTP on the web URL with a short timeout.
    expect(script).toContain('Invoke-WebRequest -Uri $webUrl -UseBasicParsing -TimeoutSec $probeTimeoutSec')
    // State machine + restart trigger.
    expect(script).toContain('function Update-Watchdog')
    expect(script).toContain('function Test-DshAlive')
    expect(script).toContain('function Invoke-WatchdogRestart')
    expect(script).toContain('function Enter-WatchdogFailure')
    // Consecutive-failure give-up: the paused phase exists.
    expect(script).toContain("$script:wd.phase = 'paused'")
    expect(script).toContain("$script:wd.autoPaused = $true")
    // Logs + status JSON the host card reads.
    expect(script).toContain(`'${WATCHDOG_LOG_NAME}'`)
    expect(script).toContain(`'${WATCHDOG_STATUS_NAME}'`)
    expect(script).toContain('function Write-WatchdogLog')
    expect(script).toContain('function Write-WatchdogStatus')
    // Tray menu controls for the watchdog.
    expect(script).toContain('暂停守护进程')
    expect(script).toContain('恢复守护进程')
    // Manual restart resets the watchdog failure counter.
    expect(script).toContain("$script:wd.restartFailures = 0")
  })

  it('bakes a custom watchdog config passed by the host', () => {
    const script = buildTrayScript({
      distro: 'Ubuntu',
      webUrl: 'http://127.0.0.1:3080',
      shortcutName: 'DeepSeek Harness',
      wslStartScript: '~/.dsh/dsh-wsl-tray/start.sh',
      wslStopScript: '~/.dsh/dsh-wsl-tray/stop.sh',
    }, {
      enabled: false,
      probeIntervalSec: 30,
      probeTimeoutSec: 5,
      downThreshold: 5,
      restartWaitSec: 300,
      maxRestartFailures: 7,
      restartBackoffSec: 120,
    })
    expect(script).toContain('$watchdogEnabled = $false')
    expect(script).toContain('$probeIntervalSec = 30')
    expect(script).toContain('$probeTimeoutSec = 5')
    expect(script).toContain('$downThreshold = 5')
    expect(script).toContain('$restartWaitSec = 300')
    expect(script).toContain('$maxRestartFailures = 7')
    expect(script).toContain('$restartBackoffSec = 120')
  })
})

describe('source-checkout launches', () => {
  const DSH_ON_PATH = 'command -v dsh >/dev/null 2>&1'
  const CONFIGURED_BRANCH = 'if [ "$SOURCE_CONFIGURED" = "1" ]; then'
  // The two call sites differ only by indentation, which is what makes the
  // launcher order assertable: 4 spaces inside the configured branch (first),
  // 2 spaces in the plain fallback chain (after the PATH check).
  const CONFIGURED_CALL = '    if source_build_ready; then\n      start_from_source_build'
  const FALLBACK_CALL = '  if source_build_ready; then\n    start_from_source_build'

  function startScript(sourceConfigured: boolean): string {
    return buildStartScript({
      nodeBin: '/usr/bin/node',
      sourceCli: '/home/me/deepseek-harness/apps/cli/lib/bin.js',
      sourceCwd: '/home/me/deepseek-harness',
      bakedCli: null,
      sourceConfigured,
      webUrl: 'http://127.0.0.1:3080',
    })
  }

  /** The launch_dsh body, where the launcher order actually lives. */
  function launchBody(script: string): string {
    return script.slice(script.indexOf('launch_dsh() {'), script.indexOf('\nlaunch_dsh\n'))
  }

  it('runs a configured checkout from its build output before the PATH dsh', () => {
    const body = launchBody(startScript(true))
    expect(body).toContain(CONFIGURED_BRANCH)
    expect(body.indexOf(CONFIGURED_CALL)).toBeGreaterThan(-1)
    expect(body.indexOf(CONFIGURED_CALL)).toBeLessThan(body.indexOf(DSH_ON_PATH))
  })

  it('keeps the PATH-first fallback order when no project path is configured', () => {
    const body = launchBody(startScript(false))
    expect(body.indexOf(DSH_ON_PATH)).toBeGreaterThan(-1)
    expect(body.indexOf(DSH_ON_PATH)).toBeLessThan(body.indexOf(FALLBACK_CALL))
  })

  it('never launches src, which would mix a src and a lib instance', () => {
    const script = startScript(true)
    expect(script).not.toContain('tsx')
    expect(script).not.toContain('src/bin.ts')
    expect(script).toContain('exec "$NODE" "$SOURCE_CLI" web --no-open')
  })

  it('fails loudly with the fix when the configured checkout was never built', () => {
    const script = startScript(true)
    expect(script).toContain('ERROR source build output is missing')
    expect(script).toContain('pnpm run build')
    expect(script).toContain('exit 1')
  })

  it('warns when the cli sources are newer than the build output', () => {
    const script = startScript(true)
    expect(script).toContain('source_build_stale')
    expect(script).toContain('newer than the build output')
    expect(script).toContain('find "$src_dir" -name \'*.ts\' -newer "$SOURCE_CLI"')
  })

  it('only auto-builds a checkout when the caller opts in', () => {
    expect(startScript(true)).toContain('DSH_WSL_TRAY_AUTO_BUILD')
  })

  it('stops a dev instance that was launched from source', () => {
    expect(buildStopScript()).toContain("pkill -f '[s]rc/bin\\.ts web'")
  })

  it('reports a configured checkout with no build output', () => {
    const launch: StartCommand = {
      nodeBin: '/usr/bin/node',
      sourceCli: null,
      sourceCwd: '/home/me/deepseek-harness',
      bakedCli: null,
      sourceConfigured: true,
      sourceBuildState: 'missing',
    }
    expect(sourceBuildProblem(launch)).toContain('pnpm run build')
    expect(sourceBuildProblem({ ...launch, sourceBuildState: 'built' })).toBeNull()
    expect(sourceBuildProblem({ ...launch, sourceConfigured: false })).toBeNull()
  })

  it('rejects a configured project path that does not exist', () => {
    expect(configuredPathProblem('/definitely/not/here')).toContain('does not exist')
    expect(configuredPathProblem('')).toBeNull()
    expect(configuredPathProblem('   ')).toBeNull()
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
