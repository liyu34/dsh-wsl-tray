/**
 * dsh-wsl-tray client half: registers its own settings section in the settings
 * shell (current DSH renders a section per registrant, so no host-side
 * namespace pairs with it any more). The section owns its controls and drives
 * the host routes.
 */

import { createElement as h } from 'react'
import { en, zh } from './locales.ts'
import { TraySettingsSection } from './SettingsSection.tsx'

const NS = 'dsh-wsl-tray'

/** Nav position: after the built-in sections (General 0, Models 10, Plugins 15, Agent presets 20). */
const SECTION_ORDER = 100

/** Structural subset of the locale service this plugin touches. */
interface LocaleService {
  register(namespace: string, dicts: { zh: Record<string, string>; en: Record<string, string> }): unknown
  bind(namespace: string): (key: string) => string
}

/** Structural subset of the slots service this plugin touches. */
interface SlotsService {
  inject(slot: string, register: () => unknown): void
  register(meta: Record<string, unknown>, render: () => unknown): unknown
}

/** Structural client context face. */
interface ClientContext {
  effect(callback: () => unknown, label?: string): void
  locale: LocaleService
  slots: SlotsService
}

export const name = 'dsh-wsl-tray'
export const inject = ['slots', 'locale']

/**
 * Register the section. The shell projects `id`, `order`, and `label` into its
 * navigation and mounts the component in the content column; the label thunk is
 * resolved per render, so switching locale needs no re-registration.
 * @param ctx - client plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-wsl-tray: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: NS,
    order: SECTION_ORDER,
    label: () => t('title'),
    inject: () => ({ t }),
  }, () => h(TraySettingsSection, { t })))
}
