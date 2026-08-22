/**
 * dsh-wsl-tray client half: registers the settings card under the namespace
 * the host serves. The card owns its own controls and drives the host routes.
 */

import { createElement as h } from 'react'
import { en, zh } from './locales.ts'
import { SettingsCard } from './SettingsCard.tsx'

const NS = 'dsh-wsl-tray'

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
 * Register the card. The `settings.plugin.item` key equals the host-registered
 * namespace, so the plugin-configuration tab pairs the two automatically.
 * @param ctx - client plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-wsl-tray: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: NS,
    locale: NS,
    inject: () => ({ t }),
  }, () => h(SettingsCard, { t })))
}
