"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
  MousePointer2,
  Plus,
  Quote,
  Trash2,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addSection,
  removeSection,
  reorderSections,
} from "@/store/slices/draftPageSlice";
import { selectSection } from "@/store/slices/uiSlice";
import {
  sectionRegistry,
  type RegisteredSectionType,
} from "@/lib/sectionRegistry";
import { cn } from "@/lib/utils";

const TYPES = Object.keys(sectionRegistry) as RegisteredSectionType[];

const ICONS: Record<RegisteredSectionType, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  hero: ImageIcon,
  featureGrid: LayoutGrid,
  testimonial: Quote,
  cta: MousePointer2,
};

interface SectionLite {
  id: string;
  type: string;
}

export function SectionList() {
  const dispatch = useAppDispatch();
  const sections = useAppSelector(
    (s) => s.draftPage.page?.sections ?? []
  ) as SectionLite[];
  const selectedId = useAppSelector((s) => s.ui.selectedSectionId);

  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = sections.map((s) => s.id);

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fromIndex = ids.indexOf(String(active.id));
    const toIndex = ids.indexOf(String(over.id));
    if (fromIndex === -1 || toIndex === -1) return;
    dispatch(reorderSections({ fromIndex, toIndex }));
  };

  const activeSection = activeId
    ? sections.find((s) => s.id === activeId)
    : null;

  return (
    <aside
      aria-label="Section list"
      className="flex h-full w-full flex-col border-r bg-card text-card-foreground"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sections
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {sections.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          // Built-in screen-reader announcements via dnd-kit's accessibility
          // module — fires "Picked up sortable item X", "Sortable item X
          // moved from position N to M", etc. into a polite live region.
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5" role="list">
              {sections.length === 0 ? (
                <li className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  Empty page. Add a section below.
                </li>
              ) : null}
              {sections.map((s, idx) => (
                <SortableItem
                  key={s.id}
                  index={idx}
                  section={s}
                  selected={s.id === selectedId}
                  isOverlay={false}
                />
              ))}
            </ul>
          </SortableContext>
          <DragOverlay>
            {activeSection ? (
              <SortableItem
                index={0}
                section={activeSection}
                selected={false}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <div className="border-t bg-muted/20 p-3">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Add section
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => {
            const Icon = ICONS[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => dispatch(addSection({ type: t }))}
                className="group inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-2 text-left text-sm font-medium transition-colors hover:border-foreground/20 hover:bg-accent"
              >
                <Icon
                  className="h-4 w-4 text-muted-foreground group-hover:text-foreground"
                  aria-hidden
                />
                <span className="truncate">{sectionRegistry[t].label}</span>
                <Plus className="ml-auto h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

interface SortableItemProps {
  index: number;
  section: SectionLite;
  selected: boolean;
  isOverlay: boolean;
}

function SortableItem({ section, selected, isOverlay }: SortableItemProps) {
  const dispatch = useAppDispatch();
  const sortable = useSortable({ id: section.id });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const Icon = ICONS[section.type as RegisteredSectionType] ?? LayoutGrid;
  const label =
    sectionRegistry[section.type as RegisteredSectionType]?.label ??
    section.type;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className="touch-none">
      <div
        className={cn(
          "group relative flex items-center gap-2 rounded-md border bg-card px-2 py-2 transition-colors",
          selected
            ? "border-ring shadow-sm ring-2 ring-ring/30"
            : "border-transparent hover:border-foreground/10 hover:bg-accent/40",
          isDragging && !isOverlay ? "opacity-40" : "",
          isOverlay ? "border-ring shadow-lg" : ""
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${label}`}
          className="grid h-7 w-5 cursor-grab place-items-center rounded text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => dispatch(selectSection(section.id))}
          aria-pressed={selected}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-md bg-muted text-muted-foreground"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{label}</span>
            <span className="block truncate font-mono text-[11px] text-muted-foreground">
              {section.id}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            dispatch(selectSection(null));
            dispatch(removeSection({ id: section.id }));
          }}
          aria-label={`Remove ${label}`}
          className="grid h-7 w-7 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </li>
  );
}

// Keep arrayMove exported for parity / tests if needed elsewhere.
export { arrayMove };
