"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FormFieldRead } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CanvasFieldCardProps {
  field: FormFieldRead;
  index: number;
  totalFields: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

export function CanvasFieldCard({
  field,
  index,
  totalFields,
  isSelected,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
}: CanvasFieldCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e, index);
  };

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={handleDragOver}
      onDrop={(e) => onDrop(e, index)}
      onClick={onSelect}
      className={cn(
        "neo-card p-4 flex items-center justify-between gap-4 cursor-grab active:cursor-grabbing hover:shadow-[6px_6px_0px_#000000] transition-all",
        isSelected
          ? "bg-accent/10 -translate-x-0.5 -translate-y-0.5 shadow-[6px_6px_0px_#000000] border-accent"
          : "bg-surface"
      )}
      id={`canvas-field-card-${field.id}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Drag Handle Indicator */}
        <div className="text-muted-foreground font-mono text-lg select-none cursor-grab">
          ⋮⋮
        </div>
        
        {/* Field Details */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="neo-pill bg-muted text-muted-foreground text-[10px] py-0 px-1.5 font-bold">
              {field.field_type.toUpperCase()}
            </span>
            {field.is_required && (
              <span className="text-red-500 font-bold text-sm">*</span>
            )}
          </div>
          <h4 className="font-bold text-base mt-1 truncate">{field.label || "Untitled Field"}</h4>
          {field.description && (
            <p className="text-xs text-muted-foreground truncate">{field.description}</p>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Reordering */}
        <Button
          variant="outline"
          size="icon"
          onClick={onMoveUp}
          disabled={index === 0}
          className="neo-btn size-8 bg-surface p-0"
          title="Move Up"
          id={`move-up-${index}`}
        >
          ▲
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onMoveDown}
          disabled={index === totalFields - 1}
          className="neo-btn size-8 bg-surface p-0"
          title="Move Down"
          id={`move-down-${index}`}
        >
          ▼
        </Button>
        
        {/* Action Controls */}
        <Button
          variant="outline"
          onClick={onSelect}
          className={cn(
            "neo-btn h-8 px-2.5 text-xs font-bold",
            isSelected ? "bg-accent text-foreground hover:bg-accent-hover" : "bg-surface"
          )}
          id={`edit-field-${index}`}
        >
          Edit
        </Button>
        <Button
          variant="outline"
          onClick={onDelete}
          className="neo-btn h-8 px-2.5 text-xs text-destructive font-bold hover:bg-destructive/10"
          id={`delete-field-${index}`}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
