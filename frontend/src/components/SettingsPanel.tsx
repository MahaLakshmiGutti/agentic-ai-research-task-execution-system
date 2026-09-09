import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "../api";
import type { AppSettings, ProviderInfo } from "../types";

/**
 * Model picker. Provider keys still live in backend/.env - this only chooses
 * which configured provider and model the agents run on, and takes effect on
 * the next run (a run in flight keeps the model it started with).
 */
export default function SettingsPanel({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (settings: AppSettings) => void;
}) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [provider, setProvider] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [custom, setCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaved(false);
    getSettings()
      .then((s) => {
        setSettings(s);
        setProvider(s.provider);
        setModel(s.model);
        const known = s.providers
          .find((p) => p.id === s.provider)
          ?.models.some((m) => m.id === s.model);
        setCustom(!known);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const active: ProviderInfo | undefined = settings?.providers.find((p) => p.id === provider);

  function pickProvider(p: ProviderInfo) {
    setProvider(p.id);
    setModel(p.default_model);
    setCustom(false);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const next = await updateSettings(provider, model.trim());
      setSettings(next);
      setSaved(true);
      onSaved?.(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Model settings"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Model settings</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Applies to the next run you start.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {!settings && !error && (
            <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </p>
          )}

          {settings && (
            <>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Provider
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {settings.providers.map((p) => {
                    const selected = p.id === provider;
                    return (
                      <button
                        key={p.id}
                        onClick={() => p.configured && pickProvider(p)}
                        disabled={!p.configured}
                        title={p.configured ? undefined : `${p.env_key} is not set in backend/.env`}
                        className={`rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10"
                            : p.configured
                              ? "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
                              : "cursor-not-allowed border-dashed border-slate-200 opacity-60 dark:border-slate-700"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {p.label}
                          {selected && <Check size={13} className="text-indigo-600 dark:text-indigo-400" />}
                        </span>
                        <span
                          className={`mt-0.5 block text-[11px] ${
                            p.configured
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {p.configured ? "key configured" : `set ${p.env_key}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Model
                </p>
                <div className="space-y-1.5">
                  {active?.models.map((m) => {
                    const selected = !custom && m.id === model;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setModel(m.id);
                          setCustom(false);
                          setSaved(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${
                          selected
                            ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {m.label}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {m.note}
                          </span>
                        </span>
                        <code className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                          {m.id}
                        </code>
                      </button>
                    );
                  })}

                  <div
                    className={`rounded-lg border px-3 py-2 transition ${
                      custom
                        ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10"
                        : "border-slate-200 dark:border-slate-600"
                    }`}
                  >
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                      <input
                        type="radio"
                        checked={custom}
                        onChange={() => {
                          setCustom(true);
                          setSaved(false);
                        }}
                        className="accent-indigo-600"
                      />
                      Custom model id
                    </label>
                    <input
                      value={custom ? model : ""}
                      onChange={(e) => {
                        setModel(e.target.value);
                        setSaved(false);
                      }}
                      onFocus={() => setCustom(true)}
                      placeholder="e.g. gpt-5.4-mini"
                      className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-800 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
          <span className="truncate font-mono text-[11px] text-slate-400 dark:text-slate-500">
            {settings ? `active: ${settings.provider} · ${settings.model}` : ""}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check size={13} /> Saved
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Close
            </button>
            <button
              onClick={save}
              disabled={saving || !settings || !model.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
