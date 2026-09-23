window.__ModuleLoader__.load({ id: "dsh-wsl-tray", factory: (require) => {


		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/** Bilingual copy for the settings card. */
		const en = {
			title: "WSL Desktop & Tray",
			description: "Desktop shortcut and system-tray launcher for DSH running in WSL.",
			status: "Status",
			regenerate: "Recreate desktop shortcut",
			regenerating: "Creating shortcut…",
			openWeb: "Open DSH web",
			shortcut: "Desktop shortcut",
			tray: "Tray helper",
			wsl: "WSL host",
			yes: "Yes",
			no: "No",
			failed: "Failed",
			notWsl: "This plugin only works when DSH itself runs inside WSL.",
			regenerated: "Shortcut created on the Windows desktop.",
			forbidden: "Request refused.",
			projectPath: "DSH project path (WSL)",
			projectPathHint: "Source checkout path, e.g. /home/me/deepseek-harness. Empty = auto-detect.",
			savePath: "Save path",
			savingPath: "Saving…",
			pathSaved: "Project path saved.",
			wdTitle: "Watchdog",
			wdEnabled: "Watchdog enabled",
			wdState: "State",
			wdRestartFailures: "Consecutive failed restarts",
			wdLastAlive: "Last alive",
			wdLastRestart: "Last restart",
			wdProbes: "Failed probes",
			wdPhaseStarting: "Starting",
			wdPhaseProbing: "Running (probing)",
			wdPhaseRestarting: "Restarting…",
			wdPhaseBackoff: "Cooling down",
			wdPhasePaused: "Paused",
			wdPhaseUnknown: "Unknown",
			wdPausedAuto: "gave up after failures",
			wdPausedUser: "paused manually",
			wdRestartOk: "OK",
			wdRestartFailed: "failed",
			wdRestartUnknown: "n/a",
			wdLog: "Watchdog log",
			wdLogRefresh: "Refresh",
			wdLogLoading: "Loading…",
			wdLogEmpty: "(no log entries yet)",
			wdNotRunning: "No watchdog state on disk yet (tray not running?)"
		};
		const zh = {
			title: "WSL 桌面与托盘",
			description: "为运行在 WSL 里的 DSH 生成 Windows 桌面快捷方式与托盘启动器。",
			status: "状态",
			regenerate: "重新生成桌面快捷方式",
			regenerating: "正在生成快捷方式…",
			openWeb: "打开 DSH 网页",
			shortcut: "桌面快捷方式",
			tray: "托盘助手",
			wsl: "WSL 主机",
			yes: "是",
			no: "否",
			failed: "失败",
			notWsl: "仅当 DSH 运行在 WSL 中时，此插件才可用。",
			regenerated: "已在 Windows 桌面生成快捷方式。",
			forbidden: "请求被拒绝。",
			projectPath: "DSH 工程路径（WSL 内）",
			projectPathHint: "源码目录，例如 /home/me/deepseek-harness。留空则自动检测。",
			savePath: "保存路径",
			savingPath: "正在保存…",
			pathSaved: "工程路径已保存。",
			wdTitle: "守护进程",
			wdEnabled: "守护进程已启用",
			wdState: "状态",
			wdRestartFailures: "连续重启失败",
			wdLastAlive: "上次存活",
			wdLastRestart: "上次重启",
			wdProbes: "探针失败次数",
			wdPhaseStarting: "启动中",
			wdPhaseProbing: "运行中（探测）",
			wdPhaseRestarting: "重启中…",
			wdPhaseBackoff: "冷却中",
			wdPhasePaused: "已暂停",
			wdPhaseUnknown: "未知",
			wdPausedAuto: "连续失败已放弃",
			wdPausedUser: "手动暂停",
			wdRestartOk: "成功",
			wdRestartFailed: "失败",
			wdRestartUnknown: "未知",
			wdLog: "守护日志",
			wdLogRefresh: "刷新",
			wdLogLoading: "加载中…",
			wdLogEmpty: "（暂无日志）",
			wdNotRunning: "磁盘上还没有守护进程状态（托盘未运行？）"
		};
		//#endregion
		//#region src/client/SettingsSection.tsx
		/**
		* The plugin's settings section. Current DSH gives every registrant its own
		* page in the settings shell (nav label + content column), so the section owns
		* only its content: the source-project path, live status rows, the watchdog
		* state and log, and the regenerate/open controls. It talks to the host through
		* `/dsh-wsl-tray/*` and depends on no settings scope of its own.
		*/
		const STYLE_ID = "dsh-wsl-tray-section-style";
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
`;
		const rowBase = {
			display: "flex",
			justifyContent: "space-between",
			gap: 12,
			fontSize: 13,
			lineHeight: 1.5,
			padding: "4px 0"
		};
		const label = { color: "var(--dsw-alias-label-tertiary)" };
		const value = {
			textAlign: "right",
			overflowWrap: "anywhere",
			color: "var(--dsw-alias-label-secondary)"
		};
		const inputStyle = {
			width: "100%",
			height: 34,
			padding: "0 12px",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 8,
			background: "var(--dsw-alias-bg-layer-3)",
			fontSize: 13,
			lineHeight: 1.5,
			color: "var(--dsw-alias-label-primary)"
		};
		function YesNo({ value }) {
			return (0, react.createElement)("span", null, value === true ? "✓" : "—");
		}
		const WD_PHASE_KEYS = {
			starting: "wdPhaseStarting",
			probing: "wdPhaseProbing",
			restarting: "wdPhaseRestarting",
			backoff: "wdPhaseBackoff",
			paused: "wdPhasePaused"
		};
		function formatTime(iso, t) {
			if (iso === null || iso === void 0 || iso === "") return "—";
			const date = new Date(iso);
			if (Number.isNaN(date.getTime())) return iso;
			const pad = (n) => String(n).padStart(2, "0");
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
		}
		function restartResultLabel(ok, t) {
			if (ok === null || ok === void 0) return t("wdRestartUnknown");
			return ok === true ? t("wdRestartOk") : t("wdRestartFailed");
		}
		/**
		* Render the plugin's settings section.
		* @param props.t - locale reader bound to this plugin's dictionary.
		* @returns the section element.
		*/
		function TraySettingsSection({ t }) {
			const [status, setStatus] = (0, react.useState)(null);
			const [watchdog, setWatchdog] = (0, react.useState)(null);
			const [phase, setPhase] = (0, react.useState)("idle");
			const [pathSavePhase, setPathSavePhase] = (0, react.useState)("idle");
			const [draftPath, setDraftPath] = (0, react.useState)("");
			const [message, setMessage] = (0, react.useState)(null);
			const [logText, setLogText] = (0, react.useState)("");
			const [logPhase, setLogPhase] = (0, react.useState)("idle");
			(0, react.useEffect)(() => {
				if (document.getElementById(STYLE_ID) === null) {
					const tag = document.createElement("style");
					tag.id = STYLE_ID;
					tag.textContent = SECTION_CSS;
					document.head.appendChild(tag);
				}
				return () => {
					document.getElementById(STYLE_ID)?.remove();
				};
			}, []);
			(0, react.useEffect)(() => {
				let live = true;
				(async () => {
					try {
						const [statusResponse, pathResponse, watchdogResponse] = await Promise.all([
							fetch("/dsh-wsl-tray/status", { cache: "no-store" }),
							fetch("/dsh-wsl-tray/project-path", { cache: "no-store" }),
							fetch("/dsh-wsl-tray/watchdog", { cache: "no-store" })
						]);
						const statusBody = await statusResponse.json();
						const pathBody = await pathResponse.json();
						const watchdogBody = await watchdogResponse.json();
						if (live) {
							setStatus(statusBody);
							setWatchdog(watchdogBody);
							if (typeof pathBody.projectPath === "string") setDraftPath(pathBody.projectPath);
							setPhase("ready");
						}
					} catch {
						if (live) setPhase("failed");
					}
				})();
				return () => {
					live = false;
				};
			}, []);
			const loadLog = async () => {
				setLogPhase("loading");
				try {
					const body = await (await fetch("/dsh-wsl-tray/watchdog-log?lines=120", { cache: "no-store" })).json();
					setLogText(typeof body.log === "string" ? body.log : "");
					setLogPhase("ready");
				} catch {
					setLogPhase("failed");
				}
			};
			const regenerate = async () => {
				setPhase("regenerating");
				setMessage(null);
				try {
					const body = await (await fetch("/dsh-wsl-tray/regenerate", { method: "POST" })).json();
					setStatus(body);
					if (body.ok === true) {
						setPhase("ready");
						setMessage(t("regenerated"));
					} else {
						setPhase("failed");
						setMessage(body.lastError ?? t("failed"));
					}
				} catch (error) {
					setPhase("failed");
					setMessage(error instanceof Error ? error.message : String(error));
				}
			};
			const savePath = async () => {
				setPathSavePhase("saving");
				setMessage(null);
				try {
					const body = await (await fetch("/dsh-wsl-tray/project-path", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ projectPath: draftPath.trim() })
					})).json();
					if (body.ok !== true) {
						setPathSavePhase("idle");
						setPhase("failed");
						setMessage(body.error ?? t("failed"));
						return;
					}
					setPathSavePhase("idle");
					setMessage(t("pathSaved"));
					await regenerate();
				} catch (error) {
					setPathSavePhase("idle");
					setPhase("failed");
					setMessage(error instanceof Error ? error.message : String(error));
				}
			};
			const busy = phase === "loading" || phase === "regenerating";
			const pathBusy = pathSavePhase === "saving";
			const shortcutOk = status?.shortcutExists === true;
			const trayOk = status?.trayScriptExists === true && status?.trayVbsExists === true && status?.iconExists === true;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-wsl-tray-section",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-wsl-tray-description",
						children: t("description")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-wsl-tray-field",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-wsl-tray-field-label",
								children: t("projectPath")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								style: inputStyle,
								value: draftPath,
								placeholder: "/home/me/deepseek-harness",
								disabled: pathBusy || busy,
								onChange: (event) => {
									setDraftPath(event.target.value);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-wsl-tray-field-hint",
								children: t("projectPathHint")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-wsl-tray-group",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-wsl-tray-group-title",
								children: t("status")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowBase,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: label,
									children: t("wsl")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: value,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(YesNo, { value: status?.wsl })
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowBase,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: label,
									children: t("shortcut")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: value,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(YesNo, { value: shortcutOk })
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowBase,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: label,
									children: t("tray")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: value,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(YesNo, { value: trayOk })
								})]
							})
						]
					}),
					watchdog?.watchdog !== null && watchdog?.watchdog !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-wsl-tray-group",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-wsl-tray-group-title",
								children: t("wdTitle")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowBase,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: label,
									children: t("wdEnabled")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: value,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(YesNo, { value: watchdog.watchdog.enabled })
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowBase,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: label,
									children: t("wdState")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: value,
									children: [t(WD_PHASE_KEYS[watchdog.watchdog.phase ?? ""] ?? "wdPhaseUnknown"), watchdog.watchdog.phase === "paused" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										" ",
										"(",
										watchdog.watchdog.autoPaused === true ? t("wdPausedAuto") : watchdog.watchdog.pausedByUser === true ? t("wdPausedUser") : t("wdPhasePaused"),
										")"
									] }) : null]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowBase,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: label,
									children: t("wdRestartFailures")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: value,
									children: [
										watchdog.watchdog.restartFailures ?? 0,
										"/",
										watchdog.watchdog.maxRestartFailures ?? "—"
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowBase,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: label,
									children: t("wdProbes")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: value,
									children: [
										watchdog.watchdog.probeFailures ?? 0,
										"/",
										watchdog.watchdog.downThreshold ?? "—",
										watchdog.watchdog.lastProbeDetail !== void 0 && watchdog.watchdog.lastProbeDetail !== "" ? ` (${watchdog.watchdog.lastProbeDetail})` : ""
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowBase,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: label,
									children: t("wdLastAlive")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: value,
									children: formatTime(watchdog.watchdog.lastAliveAt, t)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: rowBase,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: label,
									children: t("wdLastRestart")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: value,
									children: [
										formatTime(watchdog.watchdog.lastRestartAt, t),
										" ",
										"[",
										restartResultLabel(watchdog.watchdog.lastRestartOk, t),
										"]"
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dsh-wsl-tray-buttons",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									size: "sm",
									disabled: logPhase === "loading",
									onClick: () => {
										loadLog();
									},
									children: logPhase === "ready" ? t("wdLogRefresh") : t("wdLog")
								})
							}),
							logPhase === "ready" && logText !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
								style: {
									margin: "8px 0 0",
									padding: 10,
									maxHeight: 260,
									overflow: "auto",
									borderRadius: 8,
									background: "var(--dsw-alias-bg-layer-1)",
									border: "1px solid var(--dsw-alias-border-l2)",
									fontSize: 12,
									lineHeight: 1.5,
									color: "var(--dsw-alias-label-secondary)",
									whiteSpace: "pre-wrap",
									overflowWrap: "anywhere"
								},
								children: logText
							}) : null,
							logPhase === "ready" && logText === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-wsl-tray-message",
								children: t("wdLogEmpty")
							}) : null
						]
					}) : watchdog !== null && watchdog !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-wsl-tray-message",
						children: t("wdNotRunning")
					}) : null,
					status?.wsl === false ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-wsl-tray-message dsh-wsl-tray-message-error",
						children: t("notWsl")
					}) : null,
					status?.lastResult !== void 0 && phase !== "regenerating" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-wsl-tray-message",
						children: status.lastResult
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-wsl-tray-buttons",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "sm",
								disabled: pathBusy || busy || status?.wsl === false,
								onClick: () => {
									savePath();
								},
								children: pathBusy ? t("savingPath") : t("savePath")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								disabled: busy || status?.wsl === false,
								onClick: () => {
									regenerate();
								},
								children: phase === "regenerating" ? t("regenerating") : t("regenerate")
							}),
							status?.webUrl !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								onClick: () => {
									window.open(status.webUrl, "_blank", "noopener");
								},
								children: t("openWeb")
							}) : null
						]
					}),
					message !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: `dsh-wsl-tray-message${phase === "failed" ? " dsh-wsl-tray-message-error" : ""}`,
						children: message
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* dsh-wsl-tray client half: registers its own settings section in the settings
		* shell (current DSH renders a section per registrant, so no host-side
		* namespace pairs with it any more). The section owns its controls and drives
		* the host routes.
		*/
		const NS = "dsh-wsl-tray";
		/** Nav position: after the built-in sections (General 0, Models 10, Plugins 15, Agent presets 20). */
		const SECTION_ORDER = 100;
		const name = "dsh-wsl-tray";
		const inject = ["slots", "locale"];
		/**
		* Register the section. The shell projects `id`, `order`, and `label` into its
		* navigation and mounts the component in the content column; the label thunk is
		* resolved per render, so switching locale needs no re-registration.
		* @param ctx - client plugin context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-wsl-tray: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: NS,
				order: SECTION_ORDER,
				label: () => t("title"),
				inject: () => ({ t })
			}, () => (0, react.createElement)(TraySettingsSection, { t })));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map