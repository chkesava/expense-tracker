import { useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Star,
  Trash2,
  Merge,
  Palette,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useCategories } from "../hooks/useCategories";
import {
  CATEGORY_COLOR_PRESETS,
  CATEGORY_ICON_PRESETS,
} from "../utils/categoryPreferences";
import { getCategoryIcon } from "../data/categoryTaxonomy";

const fieldClass =
  "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export default function CategoryManager() {
  const {
    parentCategories,
    getSubcategories,
    addCategory,
    addSubcategory,
    renameCategory,
    setCategoryHidden,
    setCategoryFavorite,
    setCategoryStyle,
    archiveCategory,
    deleteCategory,
    mergeCategories,
  } = useCategories();

  const [newCategory, setNewCategory] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newSubByParent, setNewSubByParent] = useState<Record<string, string>>({});
  const [styleId, setStyleId] = useState<string | null>(null);
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parentCategories;
    return parentCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        getSubcategories(c.id, { includeHidden: true }).some((s) =>
          s.name.toLowerCase().includes(q)
        )
    );
  }, [parentCategories, search, getSubcategories]);

  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return;
    if (
      !window.confirm(
        "Merge will move all expenses and subcategories into the target, then delete the source. Continue?"
      )
    ) {
      return;
    }
    await mergeCategories(mergeSource, mergeTarget);
    setMergeSource("");
    setMergeTarget("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories…"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name"
          className={fieldClass}
        />
        <button
          type="button"
          onClick={() => {
            if (!newCategory.trim()) return;
            addCategory(newCategory.trim());
            setNewCategory("");
          }}
          className="min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 active:scale-95"
        >
          Add
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
        <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-800 dark:text-amber-300">
          <Merge size={16} /> Merge categories
        </div>
        <p className="mb-3 text-[11px] font-medium text-amber-700/80 dark:text-amber-200/70">
          Move expenses and subcategories from source into target, then remove the source.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            className={fieldClass}
            value={mergeSource}
            onChange={(e) => setMergeSource(e.target.value)}
          >
            <option value="">Source…</option>
            {parentCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={fieldClass}
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
          >
            <option value="">Target…</option>
            {parentCategories
              .filter((c) => c.id !== mergeSource)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!mergeSource || !mergeTarget}
            onClick={handleMerge}
            className="min-h-11 rounded-xl bg-amber-600 px-4 text-sm font-black text-white disabled:opacity-40 hover:bg-amber-700"
          >
            Merge
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="py-6 text-center text-xs italic text-slate-400">No categories.</div>
        )}
        {filtered.map((c) => {
          const open = expandedId === c.id;
          const subs = getSubcategories(c.id, { includeHidden: true });
          const styling = styleId === c.id;

          return (
            <div
              key={c.id}
              className={cn(
                "rounded-2xl border transition-all",
                c.isHidden
                  ? "border-slate-100 bg-slate-50/40 opacity-70 dark:border-slate-800 dark:bg-slate-950/40"
                  : "border-slate-100 bg-white/80 dark:border-slate-800 dark:bg-slate-950/60"
              )}
            >
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : c.id)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base"
                  style={{ backgroundColor: `${c.color || "#64748b"}22` }}
                >
                  {c.icon || getCategoryIcon(c.name)}
                </span>
                <input
                  type="text"
                  defaultValue={c.name}
                  key={`${c.id}-${c.name}`}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val && val !== c.name) renameCategory(c.id, val, true);
                  }}
                  className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm font-bold text-slate-900 outline-none dark:text-slate-100"
                />
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title="Favorite"
                    onClick={() => setCategoryFavorite(c.id, !c.isFavorite)}
                    className={cn(
                      "rounded-lg p-1.5",
                      c.isFavorite
                        ? "text-amber-500"
                        : "text-slate-400 hover:text-amber-500"
                    )}
                  >
                    <Star size={14} fill={c.isFavorite ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    title={c.isHidden ? "Show" : "Hide"}
                    onClick={() => setCategoryHidden(c.id, !c.isHidden)}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {c.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    type="button"
                    title="Icon & color"
                    onClick={() => setStyleId(styling ? null : c.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-blue-500"
                  >
                    <Palette size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => archiveCategory(c.id, !c.isArchived)}
                    className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {c.isArchived ? "Restore" : "Archive"}
                  </button>
                  {!c.isDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete “${c.name}” and its subcategories?`)) {
                          deleteCategory(c.id);
                        }
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {styling && (
                <div className="space-y-3 border-t border-slate-100 px-3 pb-3 pt-2 dark:border-slate-800">
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_ICON_PRESETS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setCategoryStyle(c.id, { icon })}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg border text-sm",
                          c.icon === icon
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                            : "border-slate-200 dark:border-slate-700"
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCategoryStyle(c.id, { color })}
                        className={cn(
                          "h-7 w-7 rounded-full border-2",
                          c.color === color ? "border-slate-900 dark:border-white" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {open && (
                <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2 dark:border-slate-800">
                  {subs.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 rounded-xl bg-slate-50/80 px-2.5 py-2 dark:bg-slate-900/50"
                    >
                      <input
                        type="text"
                        defaultValue={s.name}
                        key={`${s.id}-${s.name}`}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val && val !== s.name) renameCategory(s.id, val, true);
                        }}
                        className="min-w-0 flex-1 border-none bg-transparent p-0 text-xs font-bold text-slate-700 outline-none dark:text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setCategoryFavorite(s.id, !s.isFavorite)}
                        className={cn(
                          "rounded p-1",
                          s.isFavorite ? "text-amber-500" : "text-slate-400"
                        )}
                      >
                        <Star size={12} fill={s.isFavorite ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryHidden(s.id, !s.isHidden)}
                        className="rounded p-1 text-slate-400"
                      >
                        {s.isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      {!s.isDefault && (
                        <button
                          type="button"
                          onClick={() => deleteCategory(s.id)}
                          className="rounded p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      value={newSubByParent[c.id] || ""}
                      onChange={(e) =>
                        setNewSubByParent((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      placeholder="New subcategory…"
                      className={cn(fieldClass, "text-xs")}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const name = (newSubByParent[c.id] || "").trim();
                        if (!name) return;
                        addSubcategory(c.id, name);
                        setNewSubByParent((prev) => ({ ...prev, [c.id]: "" }));
                      }}
                      className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-3 text-[10px] font-black uppercase tracking-widest text-white dark:bg-slate-100 dark:text-slate-900"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
