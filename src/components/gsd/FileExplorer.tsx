"use client";

import { FileText, FolderOpen, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FileNode {
  name: string;
  type: "file" | "dir";
  children?: FileNode[];
  path: string;
}

interface FileExplorerProps {
  projectName: string;
  className?: string;
}

// Build tree from a flat list of file paths returned by API
function buildTree(paths: string[]): FileNode[] {
  const root: FileNode[] = [];
  for (const p of paths) {
    const isDir = p.endsWith("/");
    const cleanPath = p.replace(/\/$/, "");
    const parts = cleanPath.split("/").filter(Boolean);
    let current = root;
    let currentPath = "";
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      currentPath += "/" + name;
      const isLast = i === parts.length - 1;
      const isFile = isLast && !isDir;
      let existing = current.find((n) => n.name === name);
      if (!existing) {
        existing = { name, type: isFile ? "file" : "dir", path: currentPath, children: isFile ? undefined : [] };
        current.push(existing);
      }
      if (existing.children) current = existing.children;
    }
  }
  // Sort: dirs first, then files, alphabetical within
  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map((n) => n.children ? { ...n, children: sortNodes(n.children) } : n);
  };
  return sortNodes(root);
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "md") return <FileText className="size-3.5 text-emerald-400" />;
  if (ext === "json") return <FileText className="size-3.5 text-amber-400" />;
  if (ext === "ts" || ext === "tsx" || ext === "js") return <FileText className="size-3.5 text-sky-400" />;
  return <FileText className="size-3.5 text-slate-400" />;
}

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  if (node.type === "file") {
    return (
      <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-white/5" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
        <FileIcon name={node.name} />
        <span className="truncate text-xs text-slate-400">{node.name}</span>
      </div>
    );
  }
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 rounded px-2 py-1 hover:bg-white/5"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <ChevronRight className={cn("size-3 text-slate-600 transition-transform", expanded && "rotate-90")} />
        <FolderOpen className="size-3.5 text-sky-400" />
        <span className="text-xs font-medium text-slate-300">{node.name}</span>
        {node.children && (
          <span className="ml-auto text-[10px] text-slate-600">{node.children.length}</span>
        )}
      </button>
      {expanded && node.children?.map((child) => (
        <TreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function FileExplorer({ projectName, className }: FileExplorerProps) {
  const [files, setFiles] = useState<FileNode[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadFiles() {
    setLoading(true);
    try {
      const res = await fetch(`/api/files?project=${projectName}`);
      const data = await res.json();
      if (data.files) {
        setFiles(buildTree(data.files));
      }
    } catch {
      // Silently ignore
    } finally {
      setLoading(false);
    }
  }

  // Auto-load on mount
  if (!files && !loading) {
    loadFiles();
  }

  return (
    <div className={cn("rounded-lg border border-white/10 bg-slate-900/60", className)}>
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <FolderOpen className="size-4 text-sky-400" />
        <h3 className="text-sm font-medium text-slate-200">Planning 文件</h3>
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {loading && <div className="px-3 py-4 text-center text-xs text-slate-500">加载中...</div>}
        {files?.map((node) => (
          <TreeNode key={node.path} node={node} />
        ))}
        {!loading && files?.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-slate-500">无文件</div>
        )}
      </div>
    </div>
  );
}
