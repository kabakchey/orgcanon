import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useSelectParam } from "../lib/use-select-param";
import { useDefaultParam } from "../lib/use-default-param";
import {
  allBranchKeys,
  ancestorKeys,
  filterTree,
  findItem,
  visibleRows,
  type TreeItem,
  type TreeRow,
} from "../lib/picker/tree";

export interface TreePickerProps {
  // Singular noun for what's picked ("Team"); names the trigger, filter box and tree for a11y.
  label: string;
  paramName: string;
  tree: TreeItem[];
  // Written into the URL whenever paramName is absent from it (e.g. Org Tree's root team), which
  // also means the picker never offers to clear it.
  fallbackId?: string;
}

// Manual expand/collapse per picker, kept for the page's lifetime only.
const expandedMemory = new Map<string, Set<string>>();

export function resetTreePickerMemory(): void {
  expandedMemory.clear();
}

function highlight(label: string, query: string): ReactNode {
  const needle = query.trim().toLowerCase();
  const start = needle ? label.toLowerCase().indexOf(needle) : -1;
  if (start < 0) return label;
  const end = start + needle.length;
  return (
    <>
      {label.slice(0, start)}
      <mark>{label.slice(start, end)}</mark>
      {label.slice(end)}
    </>
  );
}

export function TreePicker({ label, paramName, tree, fallbackId }: TreePickerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const select = useSelectParam(paramName);
  const selectedId = searchParams.get(paramName) ?? fallbackId ?? undefined;
  const selectedItem = selectedId ? findItem(tree, selectedId) : undefined;
  const memoryKey = `${pathname}:${paramName}`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();
  const rowId = (key: string) => `${baseId}-row-${key}`;

  const filtered = useMemo(() => filterTree(tree, query), [tree, query]);
  const filtering = query.trim() !== "";
  const rows: TreeRow[] = useMemo(
    () => visibleRows(filtered.items, filtering ? allBranchKeys(filtered.items) : expanded),
    [filtered, filtering, expanded]
  );
  const activeIndex = rows.findIndex((row) => row.item.key === activeKey);

  useDefaultParam(paramName, fallbackId);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as globalThis.Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open && activeKey) document.getElementById(rowId(activeKey))?.scrollIntoView?.({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeKey]);

  function openPanel() {
    const remembered = expandedMemory.get(memoryKey) ?? allBranchKeys(tree);
    setExpanded(new Set([...remembered, ...(selectedId ? ancestorKeys(tree, selectedId) : [])]));
    setQuery("");
    setActiveKey(selectedItem?.key ?? tree[0]?.key ?? null);
    setOpen(true);
  }

  function close(refocus: boolean) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function updateExpanded(next: Set<string>) {
    expandedMemory.set(memoryKey, next);
    setExpanded(next);
  }

  function toggle(key: string) {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateExpanded(next);
  }

  function choose(row: TreeRow) {
    if (row.item.value === undefined) {
      if (!filtering) toggle(row.item.key);
      return;
    }
    select(row.item.value);
    close(true);
  }

  function clear() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(paramName);
      return next;
    });
    close(true);
  }

  function onQueryChange(next: string) {
    setQuery(next);
    const nextFiltered = filterTree(tree, next);
    const firstMatch = visibleRows(nextFiltered.items, allBranchKeys(nextFiltered.items)).find(
      (row) => nextFiltered.matchedKeys.has(row.item.key) && row.item.value !== undefined
    );
    setActiveKey(firstMatch?.item.key ?? null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const active = rows[activeIndex];
    const move = (index: number) => {
      const row = rows[Math.max(0, Math.min(rows.length - 1, index))];
      if (row) setActiveKey(row.item.key);
    };

    switch (event.key) {
      case "ArrowDown":
        move(activeIndex + 1);
        break;
      case "ArrowUp":
        move(activeIndex - 1);
        break;
      case "ArrowRight":
        // While filtering everything is already expanded, so arrows edit the filter text instead.
        if (filtering || !active || active.item.children.length === 0) return;
        if (expanded.has(active.item.key)) move(activeIndex + 1);
        else toggle(active.item.key);
        break;
      case "ArrowLeft":
        if (filtering || !active) return;
        if (expanded.has(active.item.key)) toggle(active.item.key);
        else if (active.parentKey) setActiveKey(active.parentKey);
        break;
      case "Enter":
        if (active) choose(active);
        break;
      case "Escape":
        close(true);
        break;
      case "Tab":
        close(false);
        return;
      default:
        return;
    }
    event.preventDefault();
  }

  const treeId = `${baseId}-tree`;
  const noun = label.toLowerCase();

  return (
    <div className="tree-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="tree-picker-trigger"
        aria-haspopup="tree"
        aria-expanded={open}
        aria-label={`${label}: ${selectedItem?.label ?? "none"}`}
        onClick={() => (open ? close(false) : openPanel())}
      >
        <span className="tree-picker-trigger-label">{selectedItem?.label ?? "Select…"}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="tree-picker-panel">
          <input
            className="tree-picker-filter"
            role="combobox"
            aria-label={`Filter ${noun}s`}
            aria-expanded="true"
            aria-controls={treeId}
            aria-autocomplete="list"
            aria-activedescendant={activeKey && activeIndex >= 0 ? rowId(activeKey) : undefined}
            placeholder="Filter…"
            value={query}
            autoFocus
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onKeyDown}
          />
          {!fallbackId && selectedItem && (
            <button type="button" className="tree-picker-clear" onClick={clear}>
              Clear
            </button>
          )}
          <div role="tree" id={treeId} aria-label={label} className="tree-picker-tree">
            {rows.map((row) => {
              const { item } = row;
              const hasChildren = item.children.length > 0;
              const isExpanded = hasChildren && (filtering || expanded.has(item.key));
              const classes = ["tree-picker-row"];
              if (item.key === activeKey) classes.push("tree-picker-active");
              if (item.value === undefined) classes.push("tree-picker-group");
              if (filtering && !filtered.matchedKeys.has(item.key)) classes.push("tree-picker-context");
              return (
                <div
                  key={item.key}
                  id={rowId(item.key)}
                  role="treeitem"
                  aria-level={row.level}
                  aria-expanded={hasChildren ? isExpanded : undefined}
                  aria-selected={item.value !== undefined && item.value === selectedId}
                  className={classes.join(" ")}
                  style={{ paddingLeft: `${(row.level - 1) * 14 + 4}px` }}
                  // Keeps focus (and the active-descendant model) in the filter box.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(row)}
                >
                  <span
                    className="tree-picker-chevron"
                    aria-hidden="true"
                    onClick={(event) => {
                      if (!hasChildren || filtering) return;
                      event.stopPropagation();
                      toggle(item.key);
                    }}
                  >
                    {hasChildren ? (isExpanded ? "▾" : "▸") : ""}
                  </span>
                  <span className="tree-picker-label">{highlight(item.label, query)}</span>
                  {item.value !== undefined && item.value === selectedId && (
                    <span className="tree-picker-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
            {rows.length === 0 && <div className="tree-picker-empty">{filtering ? "No matches" : "Nothing to select"}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
