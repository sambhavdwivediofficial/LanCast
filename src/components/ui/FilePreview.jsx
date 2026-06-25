import { useState } from "react";
import { Download, Film, Image, FileText, Archive, Music, Code, File, X } from "lucide-react";
import { motion } from "framer-motion";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

const EXT_ICONS = {
  mp4: Film, mkv: Film, avi: Film, mov: Film, webm: Film,
  png: Image, jpg: Image, jpeg: Image, gif: Image, webp: Image, svg: Image,
  mp3: Music, wav: Music, ogg: Music, flac: Music,
  pdf: FileText, doc: FileText, docx: FileText, txt: FileText, md: FileText,
  zip: Archive, rar: Archive, "7z": Archive, tar: Archive, gz: Archive,
  js: Code, ts: Code, jsx: Code, tsx: Code, rs: Code, py: Code, html: Code, css: Code,
};

const EXT_COLORS = {
  mp4: "#f87171", mkv: "#f87171", avi: "#f87171",
  png: "#4ade80", jpg: "#4ade80", jpeg: "#4ade80", gif: "#a78bfa",
  mp3: "#fb923c", wav: "#fb923c",
  pdf: "#f87171", doc: "#60a5fa", docx: "#60a5fa",
  zip: "#fbbf24", rar: "#fbbf24",
  js: "#fbbf24", ts: "#60a5fa", rs: "#fb923c",
};

function formatBytes(bytes) {
  if (!bytes) return "?";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function FilePreview({ file, onRemove, compact = false }) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(null);

  const ext = (file.fileName ?? file.name ?? "").split(".").pop()?.toLowerCase() ?? "";
  const Icon = EXT_ICONS[ext] ?? File;
  const color = EXT_COLORS[ext] ?? "#a1a1aa";
  const name = file.fileName ?? file.name ?? "Unknown file";
  const size = formatBytes(file.fileSize ?? file.size);

  const handleDownload = async () => {
    if (!file.data) return;
    setDownloading(true);
    try {
      const savePath = await save({ defaultPath: name });
      if (savePath) {
        await writeFile(savePath, new Uint8Array(file.data));
      }
    } catch {}
    setDownloading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-surface-700/60 bg-surface-800/60"
      style={{ minWidth: 180, maxWidth: 280 }}
    >
      <span
        className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon size={16} style={{ color }} />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-surface-200 truncate">{name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-2xs text-surface-500 uppercase">{ext || "file"}</span>
          <span className="text-2xs text-surface-700">·</span>
          <span className="text-2xs text-surface-500">{size}</span>
        </div>
        {progress !== null && (
          <div className="mt-1.5 w-full h-1 rounded-full bg-surface-700">
            <motion.div
              className="h-full rounded-full bg-brand-500"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        )}
      </div>

      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 p-1 rounded-lg text-surface-500 hover:text-danger-400 hover:bg-surface-700 transition-colors"
        >
          <X size={13} />
        </button>
      ) : file.data ? (
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="flex-shrink-0 p-1.5 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-surface-700 transition-colors"
          title="Download"
        >
          {downloading ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin block" />
          ) : (
            <Download size={14} />
          )}
        </button>
      ) : null}
    </motion.div>
  );
}
