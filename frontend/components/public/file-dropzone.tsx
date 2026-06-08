"use client";

import { useState, useRef } from "react";
import { FormFieldRead } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FileDropzoneProps {
  field: FormFieldRead;
  value: any[]; // Cloudinary metadata items array
  onChange: (uploadedFiles: any[]) => void;
  hasError: boolean;
}

interface UploadQueueItem {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

export function FileDropzone({
  field,
  value = [],
  onChange,
  hasError,
}: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxCount = field.file_max_count || 1;
  const maxSizeMb = field.file_max_size_mb || 5;

  // Flatten accepted types (e.g. split image/png,image/jpeg)
  const allowedMimeTypes = field.file_accepted_types
    ? field.file_accepted_types.flatMap((item) => item.split(",").map((s) => s.trim()))
    : [];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateAndUploadFiles = (filesList: FileList) => {
    const newFiles = Array.from(filesList);
    
    // Check maximum file count limit
    if (value.length + newFiles.length > maxCount) {
      toast.error(`You can only upload up to ${maxCount} file(s) for this field.`);
      return;
    }

    newFiles.forEach((file) => {
      // Validate MIME type
      if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
        toast.error(`File '${file.name}' type is not accepted. Allowed formats: ${allowedMimeTypes.join(", ")}`);
        return;
      }

      // Validate size
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > maxSizeMb) {
        toast.error(`File '${file.name}' is too large (${sizeMb.toFixed(2)} MB). Max limit: ${maxSizeMb} MB.`);
        return;
      }

      // Proceed with upload
      uploadSingleFile(file);
    });
  };

  const uploadSingleFile = (file: File) => {
    const uploadId = Math.random().toString(36).substring(7);
    const newItem: UploadQueueItem = {
      id: uploadId,
      name: file.name,
      progress: 0,
    };
    
    setQueue((prev) => [...prev, newItem]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("form_field_id", field.id);

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiBase}/api/uploads/`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setQueue((prev) =>
          prev.map((item) => (item.id === uploadId ? { ...item, progress: percent } : item))
        );
      }
    };

    xhr.onload = () => {
      if (xhr.status === 201) {
        const result = JSON.parse(xhr.response);
        // Append Cloudinary meta details
        const updatedValues = [...value, result];
        onChange(updatedValues);
        
        // Remove from upload queue
        setQueue((prev) => prev.filter((item) => item.id !== uploadId));
        toast.success(`Uploaded: ${file.name}`);
      } else {
        const detail = JSON.parse(xhr.response)?.detail || "Upload failed";
        setQueue((prev) =>
          prev.map((item) => (item.id === uploadId ? { ...item, error: detail } : item))
        );
        toast.error(`Failed uploading ${file.name}: ${detail}`);
      }
    };

    xhr.onerror = () => {
      setQueue((prev) =>
        prev.map((item) => (item.id === uploadId ? { ...item, error: "Network error" } : item))
      );
      toast.error(`Network error uploading ${file.name}.`);
    };

    xhr.send(formData);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndUploadFiles(e.target.files);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    const updated = value.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
    toast.success("File removed.");
  };

  return (
    <div className="space-y-3">
      {/* Uploaded files listing */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((file, idx) => (
            <div
              key={idx}
              className="neo-border p-2 bg-muted/15 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base" role="img" aria-label="Attached File">📎</span>
                <div className="truncate min-w-0">
                  <p className="font-bold truncate">{file.original_filename}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(file.file_size_bytes / (1024 * 1024)).toFixed(2)} MB • {file.file_type}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRemoveFile(idx)}
                className="neo-btn h-7 px-2 text-destructive hover:bg-destructive/10 text-[10px] shrink-0"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload progress queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item) => (
            <div key={item.id} className="neo-border p-2.5 bg-muted/5 space-y-1.5 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className="truncate max-w-[200px]">{item.name}</span>
                <span>{item.error ? "Failed" : `${item.progress}%`}</span>
              </div>
              {item.error ? (
                <p className="text-destructive text-[10px]">{item.error}</p>
              ) : (
                <div className="h-2 border border-border bg-surface relative overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-150"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dragzone Area */}
      {value.length < maxCount && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`neo-card p-6 border-dashed border-2 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-colors ${
            isDragActive ? "bg-accent/5 border-accent" : "bg-surface hover:bg-muted/5"
          } ${hasError ? "border-destructive" : "border-border"}`}
        >
          <span className="text-3xl" role="img" aria-label="Dropzone upload icon">
            📥
          </span>
          <div>
            <p className="font-bold text-sm">Drag and drop file here</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              or click to browse from device
            </p>
          </div>
          
          <div className="text-[9px] text-muted-foreground mt-1 space-y-0.5 font-mono">
            {allowedMimeTypes.length > 0 && (
              <div>Formats: {allowedMimeTypes.map((t) => t.split("/")[1]?.toUpperCase() || t).join(", ")}</div>
            )}
            <div>
              Limits: Max size {maxSizeMb}MB • Up to {maxCount} file(s)
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple={maxCount > 1}
            accept={allowedMimeTypes.join(",")}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
