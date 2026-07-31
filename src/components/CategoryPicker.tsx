import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Check, Search, Star } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../lib/utils";
import { useCategories } from "../hooks/useCategories";
import { getCategoryIcon } from "../data/categoryTaxonomy";
import {
  getRecentCategoryPairs,
  pushRecentCategoryPair,
} from "../utils/categoryPreferences";

interface CategoryPickerProps {
  category: string;
  subcategory: string;
  onCategoryChange: (
    category: string,
    subcategory: string,
    options?: { fromUser?: boolean }
  ) => void;
  disabled?: boolean;
  searchable?: boolean;
}

export function CategoryPicker({
  category,
  subcategory,
  onCategoryChange,
  disabled,
  searchable = true,
}: CategoryPickerProps) {
  const {
    visibleParents,
    favoriteParents,
    getSubcategories,
    addCategory,
    addSubcategory,
  } = useCategories();
  const [search, setSearch] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState(() => getRecentCategoryPairs());
  const onChangeRef = useRef(onCategoryChange);
  onChangeRef.current = onCategoryChange;

  const selectedParent = useMemo(
    () => visibleParents.find((c) => c.name === category),
    [visibleParents, category]
  );

  const subs = useMemo(() => {
    if (!selectedParent) return [];
    return getSubcategories(selectedParent.id);
  }, [selectedParent, getSubcategories]);

  const filteredParents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = visibleParents;
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        getSubcategories(c.id).some((s) => s.name.toLowerCase().includes(q))
    );
  }, [visibleParents, search, getSubcategories]);

  const filteredSubs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter((s) => s.name.toLowerCase().includes(q));
  }, [subs, search]);

  useEffect(() => {
    if (!selectedParent || subs.length === 0) return;
    const valid = subs.some((s) => s.name === subcategory);
    if (subs.length === 1 && subcategory !== subs[0].name) {
      onChangeRef.current(selectedParent.name, subs[0].name, { fromUser: false });
    } else if (!valid) {
      onChangeRef.current(selectedParent.name, subs[0].name, { fromUser: false });
    }
  }, [selectedParent, subs, subcategory]);

  useEffect(() => {
    if (visibleParents.length === 0) return;
    if (!visibleParents.some((c) => c.name === category)) {
      const first = favoriteParents[0] || visibleParents[0];
      const firstSubs = getSubcategories(first.id);
      onChangeRef.current(first.name, firstSubs[0]?.name ?? "Other", { fromUser: false });
    }
  }, [visibleParents, favoriteParents, category, getSubcategories]);

  const applyUserChange = (nextCat: string, nextSub: string) => {
    onChangeRef.current(nextCat, nextSub, { fromUser: true });
    pushRecentCategoryPair(nextCat, nextSub);
    setRecent(getRecentCategoryPairs());
  };

  const handleAddCategory = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await addCategory(newName.trim());
    applyUserChange(newName.trim(), "Other");
    setNewName("");
    setShowAddCategory(false);
    setSaving(false);
  };

  const handleAddSub = async () => {
    if (!newName.trim() || !selectedParent) return;
    setSaving(true);
    await addSubcategory(selectedParent.id, newName.trim());
    applyUserChange(selectedParent.name, newName.trim());
    setNewName("");
    setShowAddSub(false);
    setSaving(false);
  };

  return (
    <div className="space-y-2">
      {(favoriteParents.length > 0 || recent.length > 0) && (
        <div className="space-y-1.5">
          {favoriteParents.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {favoriteParents.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const nextSubs = getSubcategories(c.id);
                    applyUserChange(c.name, nextSubs[0]?.name ?? "Other");
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide transition-all",
                    category === c.name
                      ? "bg-amber-500 text-white"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300"
                  )}
                >
                  <Star size={9} fill="currentColor" />
                  {c.icon || getCategoryIcon(c.name)} {c.name}
                </button>
              ))}
            </div>
          )}
          {recent.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recent.slice(0, 5).map((r) => (
                <button
                  key={`${r.category}-${r.subcategory}-${r.at}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => applyUserChange(r.category, r.subcategory)}
                  className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {r.category} › {r.subcategory}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {searchable && (
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs font-bold text-slate-700 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="ml-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
            Category
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setShowAddCategory((p) => !p);
                setShowAddSub(false);
                setNewName("");
              }}
              className={cn(
                "ml-auto flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest transition-all",
                showAddCategory
                  ? "bg-slate-200 text-slate-600 dark:bg-slate-700"
                  : "bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-900/30"
              )}
            >
              {showAddCategory ? <X size={9} /> : <Plus size={9} />}
              New
            </button>
          </label>

          <div className="relative">
            <select
              disabled={disabled}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200"
              value={category}
              onChange={(e) => {
                const next = e.target.value;
                const parent = visibleParents.find((c) => c.name === next);
                const nextSubs = parent ? getSubcategories(parent.id) : [];
                applyUserChange(next, nextSubs[0]?.name ?? "Other");
              }}
            >
              {filteredParents.map((c) => (
                <option key={c.id} value={c.name}>
                  {(c.icon || getCategoryIcon(c.name)) + " "}
                  {c.name}
                  {c.isFavorite ? " ★" : ""}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
              ▼
            </div>
          </div>
          {selectedParent?.color && (
            <div
              className="ml-1 h-1 w-10 rounded-full"
              style={{ backgroundColor: selectedParent.color }}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <label className="ml-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
            Subcategory
            <button
              type="button"
              disabled={disabled || !selectedParent}
              onClick={() => {
                setShowAddSub((p) => !p);
                setShowAddCategory(false);
                setNewName("");
              }}
              className={cn(
                "ml-auto flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest transition-all",
                showAddSub
                  ? "bg-slate-200 text-slate-600 dark:bg-slate-700"
                  : "bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-900/30"
              )}
            >
              {showAddSub ? <X size={9} /> : <Plus size={9} />}
              New
            </button>
          </label>

          <div className="relative">
            <select
              disabled={disabled || filteredSubs.length === 0}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200"
              value={subcategory}
              onChange={(e) => applyUserChange(category, e.target.value)}
            >
              {filteredSubs.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                  {s.isFavorite ? " ★" : ""}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
              ▼
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(showAddCategory || showAddSub) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 p-2 dark:border-rose-800/50 dark:bg-rose-950/30">
              <input
                type="text"
                autoFocus
                placeholder={showAddCategory ? "New category name…" : "New subcategory name…"}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (showAddCategory) await handleAddCategory();
                    else await handleAddSub();
                  }
                  if (e.key === "Escape") {
                    setShowAddCategory(false);
                    setShowAddSub(false);
                    setNewName("");
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-200"
              />
              <button
                type="button"
                disabled={!newName.trim() || saving}
                onClick={showAddCategory ? handleAddCategory : handleAddSub}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-rose-500 px-2 py-1 text-[9px] font-black uppercase text-white hover:bg-rose-600 disabled:opacity-40"
              >
                <Check size={9} />
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
