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
			pathSaved: "Project path saved."
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
			pathSaved: "工程路径已保存。"
		};
		//#endregion
		//#region src/client/SettingsCard.tsx
		/**
		* The plugin card on the plugin-configuration tab. It mirrors the host's
		* PluginCard chrome (collapsible header, name over description, chevron) using
		* the same design tokens, and owns its controls: the source-project path,
		* status rows, and the regenerate/open buttons. The card talks to the host
		* through `/dsh-wsl-tray/*`; it does not depend on the settings scope.
		*/
		const STYLE_ID = "dsh-wsl-tray-card-style";
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
		/**
		* Render the plugin's settings card.
		* @param props.t - locale reader bound to this plugin's dictionary.
		* @returns the card element.
		*/
		function SettingsCard({ t }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [status, setStatus] = (0, react.useState)(null);
			const [phase, setPhase] = (0, react.useState)("idle");
			const [pathSavePhase, setPathSavePhase] = (0, react.useState)("idle");
			const [draftPath, setDraftPath] = (0, react.useState)("");
			const [message, setMessage] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (document.getElementById(STYLE_ID) === null) {
					const tag = document.createElement("style");
					tag.id = STYLE_ID;
					tag.textContent = CARD_CSS;
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
						const [statusResponse, pathResponse] = await Promise.all([fetch("/dsh-wsl-tray/status", { cache: "no-store" }), fetch("/dsh-wsl-tray/project-path", { cache: "no-store" })]);
						const statusBody = await statusResponse.json();
						const pathBody = await pathResponse.json();
						if (live) {
							setStatus(statusBody);
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: `dsh-wsl-tray-card${open ? " dsh-wsl-tray-card-open" : ""}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dsh-wsl-tray-header",
					"aria-expanded": open,
					"aria-label": `${t("title")}`,
					onClick: () => {
						setOpen(!open);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-wsl-tray-head-text",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-wsl-tray-name",
							children: t("title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-wsl-tray-description",
							children: t("description")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: `dsh-wsl-tray-chevron${open ? " dsh-wsl-tray-chevron-open" : ""}` })]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-wsl-tray-body",
					children: [
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
						}),
						status?.wsl === false ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-wsl-tray-message",
							style: { color: "var(--dsw-alias-label-error)" },
							children: t("notWsl")
						}) : null,
						status?.lastResult !== void 0 && phase !== "regenerating" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-wsl-tray-message",
							style: { color: "var(--dsw-alias-label-tertiary)" },
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
							className: "dsh-wsl-tray-message",
							style: { color: phase === "failed" ? "var(--dsw-alias-label-error)" : "var(--dsw-alias-label-tertiary)" },
							children: message
						}) : null
					]
				}) : null]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* dsh-wsl-tray client half: registers the settings card under the namespace
		* the host serves. The card owns its own controls and drives the host routes.
		*/
		const NS = "dsh-wsl-tray";
		const name = "dsh-wsl-tray";
		const inject = ["slots", "locale"];
		/**
		* Register the card. The `settings.plugin.item` key equals the host-registered
		* namespace, so the plugin-configuration tab pairs the two automatically.
		* @param ctx - client plugin context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-wsl-tray: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: NS,
				locale: NS,
				inject: () => ({ t })
			}, () => (0, react.createElement)(SettingsCard, { t })));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map