import { useState } from "react";
import { motion } from "framer-motion";
import { File, FileText, Image, Video, X, Download } from "lucide-react";

const MIME_ICONS = {
  "image/": Image,
  "video/": Video,
  "application/pdf": FileText,
  "text/": FileText,
};

function getIcon(mime) {
  for (const [prefix, Icon] of Object.entries(MIME_ICONS)) {
    if (mime.startsWith(prefix)) return Icon;
  }
  return File;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilePreview({ file, onRemove, downloadable = false, transferProgress }) {
  const Icon = getIcon(file.mime_type || file.type || "");
  const progress = transferProgress?.progress ?? undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative group flex items-center gap-3 p-3 rounded-xl border ${
        progress !== undefined
          ? "bg-surface-800/50 border-surface-700"
          : "bg-surface-800 border-surface-700 hover:border-surface-600"
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-surface-300" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-surface-200 truncate max-w-[180px]">
          {file.file_name || file.name}
        </p>
        <p className="text-2xs text-surface-500">
          {formatSize(file.file_size || file.size)}
          {progress !== undefined && !file.completed && (
            <span className="ml-2 text-brand-400">{progress}%</span>
          )}
          {file.completed && (
            <span className="ml-2 text-success-400">Done</span>
          )}
        </p>
        {progress !== undefined && !file.completed && (
          <div className="mt-1.5 w-full h-1 bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {downloadable && file.completed && (
          <button
            className="p-1.5 rounded-md text-surface-400 hover:text-brand-400 hover:bg-surface-700 transition-colors"
            title="Download"
          >
            <Download size={16} />
          </button>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(file)}
            className="p-1.5 rounded-md text-surface-400 hover:text-danger-400 hover:bg-surface-700 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
