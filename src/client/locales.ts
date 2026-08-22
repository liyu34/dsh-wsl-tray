/** Bilingual copy for the settings card. */
export const en = {
  title: 'WSL Desktop & Tray',
  description: 'Desktop shortcut and system-tray launcher for DSH running in WSL.',
  status: 'Status',
  regenerate: 'Recreate desktop shortcut',
  regenerating: 'Creating shortcut…',
  openWeb: 'Open DSH web',
  shortcut: 'Desktop shortcut',
  tray: 'Tray helper',
  wsl: 'WSL host',
  yes: 'Yes',
  no: 'No',
  failed: 'Failed',
  notWsl: 'This plugin only works when DSH itself runs inside WSL.',
  regenerated: 'Shortcut created on the Windows desktop.',
  forbidden: 'Request refused.',
} satisfies Record<string, string>

export const zh = {
  title: 'WSL 桌面与托盘',
  description: '为运行在 WSL 里的 DSH 生成 Windows 桌面快捷方式与托盘启动器。',
  status: '状态',
  regenerate: '重新生成桌面快捷方式',
  regenerating: '正在生成快捷方式…',
  openWeb: '打开 DSH 网页',
  shortcut: '桌面快捷方式',
  tray: '托盘助手',
  wsl: 'WSL 主机',
  yes: '是',
  no: '否',
  failed: '失败',
  notWsl: '仅当 DSH 运行在 WSL 中时，此插件才可用。',
  regenerated: '已在 Windows 桌面生成快捷方式。',
  forbidden: '请求被拒绝。',
} satisfies Record<string, string>

export type LocaleKey = keyof typeof en
