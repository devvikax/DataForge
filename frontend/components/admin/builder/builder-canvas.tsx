"use client";

import { useState, useRef } from "react";
import { CanvasFieldCard } from "./canvas-field-card";
import { FormFieldRead } from "@/lib/api";

interface BuilderCanvasProps {
  fields: FormFieldRead[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onDeleteField: (index: number) => void;
  onReorderFields: (newFields: FormFieldRead[]) => void;
}

export function BuilderCanvas({
  fields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  onReorderFields,
}: BuilderCanvasProps) {
  const dragItem = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItem.current = index;
    // Set transfer data for browser compatibility
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = dragItem.current;
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    const reordered = [...fields];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Reassign orders
    const updated = reordered.map((field, idx) => ({
      ...field,
      order: idx,
    }));

    onReorderFields(updated);
    dragItem.current = null;
  };

  const moveFieldUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...fields];
    // Swap items
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    
    // Update orders
    const updated = reordered.map((field, idx) => ({
      ...field,
      order: idx,
    }));
    onReorderFields(updated);
  };

  const moveFieldDown = (index: number) => {
    if (index === fields.length - 1) return;
    const reordered = [...fields];
    // Swap items
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];

    // Update orders
    const updated = reordered.map((field, idx) => ({
      ...field,
      order: idx,
    }));
    onReorderFields(updated);
  };

  return (
    <div className="flex flex-col gap-3 min-h-[400px]" id="builder-canvas">
      {fields.length === 0 ? (
        <div className="neo-card flex flex-col items-center justify-center py-20 text-center bg-muted/20 border-dashed border-2">
          <span className="text-4xl" role="img" aria-label="Canvas empty">✨</span>
          <h4 className="font-bold text-lg mt-3">Canvas is Empty</h4>
          <p className="text-muted-foreground text-sm max-w-xs mt-1">
            Choose a field type from the palette on the left to start building your custom form.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <CanvasFieldCard
              key={field.id}
              field={field}
              index={index}
              totalFields={fields.length}
              isSelected={selectedFieldId === field.id}
              onSelect={() => onSelectField(field.id)}
              onDelete={() => onDeleteField(index)}
              onMoveUp={() => moveFieldUp(index)}
              onMoveDown={() => moveFieldDown(index)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}
