/**
 * The plugin card on the plugin-configuration tab. It mirrors the host's
 * PluginCard chrome (collapsible header, name over description, chevron) using
 * the same design tokens, and owns its controls: the source-project path,
 * status rows, and the regenerate/open buttons. The card talks to the host
 * through `/dsh-wsl-tray/*`; it does not depend on the settings scope.
 */

import { createElement as h, Fragment, useEffect, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { Button, IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { LocaleKey } from './locales.ts'

export interface SettingsCardProps {
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

type Phase = 'idle' | 'loading' | 'regenerating' | 'ready' | 'failed'
type PathSavePhase = 'idle' | 'saving'

const STYLE_ID = 'dsh-wsl-tray-card-style'
const CARD_CSS = `
.dsh-wsl-tray-card{list-style:none;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-3);transition:border-color .16s,background .16s}
.dsh-wsl-tray-card:hover{border-color:var(--dsw-alias-label-dimmed)}
.dsh-wsl-tray-card-open{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}
.dsh-wsl-tray-header{width:100%;appearance:none;border:0;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer;display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px}
.dsh-wsl-tray-header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.dsh-wsl-tray-head-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.dsh-wsl-tray-name{font-size:15px;font-weight:600;line-height:1.4;color:var(--dsw-alias-label-primary)}
.dsh-wsl-tray-description{font-size:13px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}
.dsh-wsl-tray-chevron{flex:none;color:var(--dsw-alias-label-tertiary);transition:transform .16s}
.dsh-wsl-tray-chevron-open{transform:rotate(180deg)}
.dsh-wsl-tray-body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding:8px 0 12px}
.dsh-wsl-tray-status-row{display:flex;justify-content:space-between;gap:12px;font-size:13px;line-height:1.5;padding:4px 0}
.dsh-wsl-tray-status-label{color:var(--dsw-alias-label-tertiary)}
.dsh-wsl-tray-status-value{text-align:right;overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary)}
.dsh-wsl-tray-field{display:flex;flex-direction:column;gap:6px;padding:10px 0}
.dsh-wsl-tray-field-label{font-size:13px;font-weight:500;line-height:1.5;color:var(--dsw-alias-label-primary)}
.dsh-wsl-tray-field-hint{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}
.dsh-wsl-tray-message{font-size:12px;line-height:1.5;overflow-wrap:anywhere;margin:8px 0 0}
.dsh-wsl-tray-buttons{display:flex;flex-wrap:wrap;gap:8px;padding-top:10px}
`
const rowBase: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, lineHeight: 1.5, padding: '4px 0' }
const label: CSSProperties = { color: 'var(--dsw-alias-label-tertiary)' }
const value: CSSProperties = { textAlign: 'right', overflowWrap: 'anywhere', color: 'var(--dsw-alias-label-secondary)' }
const inputStyle: CSSProperties = { width: '100%', height: 34, padding: '0 12px', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-3)', fontSize: 13, lineHeight: 1.5, color: 'var(--dsw-alias-label-primary)' }

function YesNo({ value }: { value: boolean | undefined }): ReactElement {
  return h('span', null, value === true ? '✓' : '—')
}

/**
 * Render the plugin's settings card.
 * @param props.t - locale reader bound to this plugin's dictionary.
 * @returns the card element.
 */
export function SettingsCard({ t }: SettingsCardProps): ReactElement {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<StatusBody | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [pathSavePhase, setPathSavePhase] = useState<PathSavePhase>('idle')
  const [draftPath, setDraftPath] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (document.getElementById(STYLE_ID) === null) {
      const tag = document.createElement('style')
      tag.id = STYLE_ID
      tag.textContent = CARD_CSS
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
        const [statusResponse, pathResponse] = await Promise.all([
          fetch('/dsh-wsl-tray/status', { cache: 'no-store' }),
          fetch('/dsh-wsl-tray/project-path', { cache: 'no-store' }),
        ])
        const statusBody = (await statusResponse.json()) as StatusBody
        const pathBody = (await pathResponse.json()) as ProjectPathBody
        if (live) {
          setStatus(statusBody)
          if (typeof pathBody.projectPath === 'string') setDraftPath(pathBody.projectPath)
          setPhase('ready')
        }
      } catch {
        if (live) setPhase('failed')
      }
    })()
    return () => { live = false }
  }, [])

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
  const cardClass = `dsh-wsl-tray-card${open ? ' dsh-wsl-tray-card-open' : ''}`

  return (
    <li className={cardClass}>
      <button
        type="button"
        className="dsh-wsl-tray-header"
        aria-expanded={open}
        aria-label={`${t('title')}`}
        onClick={() => { setOpen(!open) }}
      >
        <span className="dsh-wsl-tray-head-text">
          <span className="dsh-wsl-tray-name">{t('title')}</span>
          <span className="dsh-wsl-tray-description">{t('description')}</span>
        </span>
        <IconChevronDownOutline14 className={`dsh-wsl-tray-chevron${open ? ' dsh-wsl-tray-chevron-open' : ''}`} />
      </button>
      {open
        ? (
          <div className="dsh-wsl-tray-body">
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

            <div style={rowBase}><span style={label}>{t('wsl')}</span><span style={value}><YesNo value={status?.wsl} /></span></div>
            <div style={rowBase}><span style={label}>{t('shortcut')}</span><span style={value}><YesNo value={shortcutOk} /></span></div>
            <div style={rowBase}><span style={label}>{t('tray')}</span><span style={value}><YesNo value={trayOk} /></span></div>

            {status?.wsl === false
              ? <p className="dsh-wsl-tray-message" style={{ color: 'var(--dsw-alias-label-error)' }}>{t('notWsl')}</p>
              : null}
            {status?.lastResult !== undefined && phase !== 'regenerating'
              ? <p className="dsh-wsl-tray-message" style={{ color: 'var(--dsw-alias-label-tertiary)' }}>{status.lastResult}</p>
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
              ? <p className="dsh-wsl-tray-message" style={{ color: phase === 'failed' ? 'var(--dsw-alias-label-error)' : 'var(--dsw-alias-label-tertiary)' }}>{message}</p>
              : null}
          </div>
        )
        : null}
    </li>
  )
}
