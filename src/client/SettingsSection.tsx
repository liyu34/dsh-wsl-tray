/**
 * The plugin's settings section. Current DSH gives every registrant its own
 * page in the settings shell (nav label + content column), so the section owns
 * only its content: the source-project path, live status rows, the watchdog
 * state and log, and the regenerate/open controls. It talks to the host through
 * `/dsh-wsl-tray/*` and depends on no settings scope of its own.
 */

import { createElement as h, useEffect, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { LocaleKey } from './locales.ts'

export interface TraySettingsSectionProps {
  t: (key: LocaleKey) => string
}

interface StatusBody {
  ok?: boolean
  wsl?: boolean
  webUrl?: string
  shortcutName?: string
  shortcutPath?: string
  shortcutExists?: boolean
  trayScriptExists?: boolean
  trayVbsExists?: boolean
  iconExists?: boolean
  startScriptExists?: boolean
  lastError?: string
  lastResult?: string
}

interface ProjectPathBody {
  ok?: boolean
  projectPath?: string
  error?: string
}

interface WatchdogStatusC {
  enabled?: boolean
  phase?: string
  pausedByUser?: boolean
  autoPaused?: boolean
  restartFailures?: number
  maxRestartFailures?: number
  probeFailures?: number
  downThreshold?: number
  lastProbeDetail?: string
  lastAliveAt?: string | null
  lastRestartAt?: string | null
  lastRestartOk?: boolean | null
}

interface WatchdogBody {
  ok?: boolean
  watchdog?: WatchdogStatusC | null
  log?: string
}

type Phase = 'idle' | 'loading' | 'regenerating' | 'ready' | 'failed'
type PathSavePhase = 'idle' | 'saving'
type LogPhase = 'idle' | 'loading' | 'ready' | 'failed'

const STYLE_ID = 'dsh-wsl-tray-section-style'
const SECTION_CSS = `
.dsh-wsl-tray-section{display:flex;flex-direction:column;gap:2px;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary)}
.dsh-wsl-tray-description{margin:0 0 6px;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}
.dsh-wsl-tray-field{display:flex;flex-direction:column;gap:6px;padding:10px 0}
.dsh-wsl-tray-field-label{font-size:13px;font-weight:500;line-height:1.5;color:var(--dsw-alias-label-primary)}
.dsh-wsl-tray-field-hint{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}
.dsh-wsl-tray-group{display:flex;flex-direction:column;gap:2px;padding:10px 0;border-top:1px solid var(--dsw-alias-border-l2)}
.dsh-wsl-tray-group-title{font-size:13px;font-weight:600;line-height:1.5;color:var(--dsw-alias-label-primary);padding-bottom:4px}
.dsh-wsl-tray-message{font-size:12px;line-height:1.5;overflow-wrap:anywhere;margin:8px 0 0;color:var(--dsw-alias-label-tertiary)}
.dsh-wsl-tray-message-error{color:var(--dsw-alias-label-error)}
.dsh-wsl-tray-buttons{display:flex;flex-wrap:wrap;gap:8px;padding-top:12px}
`
const rowBase: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, lineHeight: 1.5, padding: '4px 0' }
const label: CSSProperties = { color: 'var(--dsw-alias-label-tertiary)' }
const value: CSSProperties = { textAlign: 'right', overflowWrap: 'anywhere', color: 'var(--dsw-alias-label-secondary)' }
const inputStyle: CSSProperties = { width: '100%', height: 34, padding: '0 12px', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-3)', fontSize: 13, lineHeight: 1.5, color: 'var(--dsw-alias-label-primary)' }

function YesNo({ value }: { value: boolean | undefined }): ReactElement {
  return h('span', null, value === true ? '✓' : '—')
}

const WD_PHASE_KEYS: Record<string, LocaleKey> = {
  starting: 'wdPhaseStarting',
  probing: 'wdPhaseProbing',
  restarting: 'wdPhaseRestarting',
  backoff: 'wdPhaseBackoff',
  paused: 'wdPhasePaused',
}

function formatTime(iso: string | null | undefined, t: (key: LocaleKey) => string): string {
  if (iso === null || iso === undefined || iso === '') return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function restartResultLabel(ok: boolean | null | undefined, t: (key: LocaleKey) => string): string {
  if (ok === null || ok === undefined) return t('wdRestartUnknown')
  return ok === true ? t('wdRestartOk') : t('wdRestartFailed')
}

/**
 * Render the plugin's settings section.
 * @param props.t - locale reader bound to this plugin's dictionary.
 * @returns the section element.
 */
export function TraySettingsSection({ t }: TraySettingsSectionProps): ReactElement {
  const [status, setStatus] = useState<StatusBody | null>(null)
  const [watchdog, setWatchdog] = useState<WatchdogBody | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [pathSavePhase, setPathSavePhase] = useState<PathSavePhase>('idle')
  const [draftPath, setDraftPath] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [logText, setLogText] = useState('')
  const [logPhase, setLogPhase] = useState<LogPhase>('idle')

  useEffect(() => {
    if (document.getElementById(STYLE_ID) === null) {
      const tag = document.createElement('style')
      tag.id = STYLE_ID
      tag.textContent = SECTION_CSS
      document.head.appendChild(tag)
    }
    return () => {
      document.getElementById(STYLE_ID)?.remove()
    }
  }, [])

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const [statusResponse, pathResponse, watchdogResponse] = await Promise.all([
          fetch('/dsh-wsl-tray/status', { cache: 'no-store' }),
          fetch('/dsh-wsl-tray/project-path', { cache: 'no-store' }),
          fetch('/dsh-wsl-tray/watchdog', { cache: 'no-store' }),
        ])
        const statusBody = (await statusResponse.json()) as StatusBody
        const pathBody = (await pathResponse.json()) as ProjectPathBody
        const watchdogBody = (await watchdogResponse.json()) as WatchdogBody
        if (live) {
          setStatus(statusBody)
          setWatchdog(watchdogBody)
          if (typeof pathBody.projectPath === 'string') setDraftPath(pathBody.projectPath)
          setPhase('ready')
        }
      } catch {
        if (live) setPhase('failed')
      }
    })()
    return () => { live = false }
  }, [])

  const loadLog = async (): Promise<void> => {
    setLogPhase('loading')
    try {
      const response = await fetch('/dsh-wsl-tray/watchdog-log?lines=120', { cache: 'no-store' })
      const body = (await response.json()) as WatchdogBody
      setLogText(typeof body.log === 'string' ? body.log : '')
      setLogPhase('ready')
    } catch {
      setLogPhase('failed')
    }
  }

  const regenerate = async (): Promise<void> => {
    setPhase('regenerating')
    setMessage(null)
    try {
      const response = await fetch('/dsh-wsl-tray/regenerate', { method: 'POST' })
      const body = (await response.json()) as StatusBody
      setStatus(body)
      if (body.ok === true) {
        setPhase('ready')
        setMessage(t('regenerated'))
      } else {
        setPhase('failed')
        setMessage(body.lastError ?? t('failed'))
      }
    } catch (error) {
      setPhase('failed')
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const savePath = async (): Promise<void> => {
    setPathSavePhase('saving')
    setMessage(null)
    try {
      const response = await fetch('/dsh-wsl-tray/project-path', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectPath: draftPath.trim() }),
      })
      const body = (await response.json()) as ProjectPathBody
      if (body.ok !== true) {
        setPathSavePhase('idle')
        setPhase('failed')
        setMessage(body.error ?? t('failed'))
        return
      }
      setPathSavePhase('idle')
      setMessage(t('pathSaved'))
      await regenerate()
    } catch (error) {
      setPathSavePhase('idle')
      setPhase('failed')
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const busy = phase === 'loading' || phase === 'regenerating'
  const pathBusy = pathSavePhase === 'saving'
  const shortcutOk = status?.shortcutExists === true
  const trayOk = status?.trayScriptExists === true && status?.trayVbsExists === true && status?.iconExists === true

  return (
    <div className="dsh-wsl-tray-section">
      <p className="dsh-wsl-tray-description">{t('description')}</p>

      <div className="dsh-wsl-tray-field">
        <span className="dsh-wsl-tray-field-label">{t('projectPath')}</span>
        <input
          style={inputStyle}
          value={draftPath}
          placeholder="/home/me/deepseek-harness"
          disabled={pathBusy || busy}
          onChange={(event) => { setDraftPath(event.target.value) }}
        />
        <span className="dsh-wsl-tray-field-hint">{t('projectPathHint')}</span>
      </div>

      <div className="dsh-wsl-tray-group">
        <span className="dsh-wsl-tray-group-title">{t('status')}</span>
        <div style={rowBase}><span style={label}>{t('wsl')}</span><span style={value}><YesNo value={status?.wsl} /></span></div>
        <div style={rowBase}><span style={label}>{t('shortcut')}</span><span style={value}><YesNo value={shortcutOk} /></span></div>
        <div style={rowBase}><span style={label}>{t('tray')}</span><span style={value}><YesNo value={trayOk} /></span></div>
      </div>

      {watchdog?.watchdog !== null && watchdog?.watchdog !== undefined
        ? (
          <div className="dsh-wsl-tray-group">
            <span className="dsh-wsl-tray-group-title">{t('wdTitle')}</span>
            <div style={rowBase}><span style={label}>{t('wdEnabled')}</span><span style={value}><YesNo value={watchdog.watchdog.enabled} /></span></div>
            <div style={rowBase}>
              <span style={label}>{t('wdState')}</span>
              <span style={value}>
                {t(WD_PHASE_KEYS[watchdog.watchdog.phase ?? ''] ?? 'wdPhaseUnknown')}
                {watchdog.watchdog.phase === 'paused'
                  ? (
                    <span>
                      {' '}
                      (
                      {watchdog.watchdog.autoPaused === true
                        ? t('wdPausedAuto')
                        : watchdog.watchdog.pausedByUser === true
                          ? t('wdPausedUser')
                          : t('wdPhasePaused')}
                      )
                    </span>
                  )
                  : null}
              </span>
            </div>
            <div style={rowBase}>
              <span style={label}>{t('wdRestartFailures')}</span>
              <span style={value}>
                {watchdog.watchdog.restartFailures ?? 0}
                /
                {watchdog.watchdog.maxRestartFailures ?? '—'}
              </span>
            </div>
            <div style={rowBase}>
              <span style={label}>{t('wdProbes')}</span>
              <span style={value}>
                {watchdog.watchdog.probeFailures ?? 0}
                /
                {watchdog.watchdog.downThreshold ?? '—'}
                {watchdog.watchdog.lastProbeDetail !== undefined && watchdog.watchdog.lastProbeDetail !== ''
                  ? ` (${watchdog.watchdog.lastProbeDetail})`
                  : ''}
              </span>
            </div>
            <div style={rowBase}><span style={label}>{t('wdLastAlive')}</span><span style={value}>{formatTime(watchdog.watchdog.lastAliveAt, t)}</span></div>
            <div style={rowBase}>
              <span style={label}>{t('wdLastRestart')}</span>
              <span style={value}>
                {formatTime(watchdog.watchdog.lastRestartAt, t)}
                {' '}
                [{restartResultLabel(watchdog.watchdog.lastRestartOk, t)}]
              </span>
            </div>
            <div className="dsh-wsl-tray-buttons">
              <Button
                variant="outline"
                size="sm"
                disabled={logPhase === 'loading'}
                onClick={() => { void loadLog() }}
              >
                {logPhase === 'ready' ? t('wdLogRefresh') : t('wdLog')}
              </Button>
            </div>
            {logPhase === 'ready' && logText !== ''
              ? (
                <pre
                  style={{
                    margin: '8px 0 0',
                    padding: 10,
                    maxHeight: 260,
                    overflow: 'auto',
                    borderRadius: 8,
                    background: 'var(--dsw-alias-bg-layer-1)',
                    border: '1px solid var(--dsw-alias-border-l2)',
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: 'var(--dsw-alias-label-secondary)',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {logText}
                </pre>
              )
              : null}
            {logPhase === 'ready' && logText === ''
              ? <p className="dsh-wsl-tray-message">{t('wdLogEmpty')}</p>
              : null}
          </div>
        )
        : watchdog !== null && watchdog !== undefined
          ? <p className="dsh-wsl-tray-message">{t('wdNotRunning')}</p>
          : null}

      {status?.wsl === false
        ? <p className="dsh-wsl-tray-message dsh-wsl-tray-message-error">{t('notWsl')}</p>
        : null}
      {status?.lastResult !== undefined && phase !== 'regenerating'
        ? <p className="dsh-wsl-tray-message">{status.lastResult}</p>
        : null}

      <div className="dsh-wsl-tray-buttons">
        <Button
          variant="primary"
          size="sm"
          disabled={pathBusy || busy || status?.wsl === false}
          onClick={() => { void savePath() }}
        >
          {pathBusy ? t('savingPath') : t('savePath')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy || status?.wsl === false}
          onClick={() => { void regenerate() }}
        >
          {phase === 'regenerating' ? t('regenerating') : t('regenerate')}
        </Button>
        {status?.webUrl !== undefined
          ? (
            <Button variant="outline" size="sm" onClick={() => { window.open(status.webUrl, '_blank', 'noopener') }}>
              {t('openWeb')}
            </Button>
          )
          : null}
      </div>

      {message !== null
        ? <p className={`dsh-wsl-tray-message${phase === 'failed' ? ' dsh-wsl-tray-message-error' : ''}`}>{message}</p>
        : null}
    </div>
  )
}
