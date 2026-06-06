"use client";

/** A model option as returned by GET /api/models. */
export type ModelOption = {
  id: string;
  label: string;
  provider: string;
  free: boolean;
  /** True if the provider's API key is configured on the server. */
  available: boolean;
};

/**
 * Multi-select list of models. Each model is a checkbox; models whose key is
 * not configured are disabled with a hint. Picking several runs them all and
 * shows the results side by side — that's the model-comparison feature.
 */
export default function ModelPicker({
  models,
  selected,
  onToggle,
}: {
  models: ModelOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-slate-600">
        Models to compare
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {models.map((m) => {
          const isOn = selected.has(m.id);
          return (
            <label
              key={m.id}
              className={[
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                m.available
                  ? "cursor-pointer border-slate-200 bg-white hover:border-indigo-300"
                  : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60",
                isOn ? "ring-2 ring-indigo-500" : "",
              ].join(" ")}
              title={
                m.available
                  ? ""
                  : "API key not set — add it to .env.local and restart"
              }
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-600"
                checked={isOn}
                disabled={!m.available}
                onChange={() => onToggle(m.id)}
              />
              <span className="flex-1 font-medium text-slate-800">
                {m.label}
              </span>
              {m.free ? (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
                  free
                </span>
              ) : (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
                  paid
                </span>
              )}
              {!m.available && (
                <span className="text-xs text-slate-400">no key</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
