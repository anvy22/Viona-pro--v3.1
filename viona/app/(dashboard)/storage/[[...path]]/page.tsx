"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Toolbar from "../components/Toolbar";
import FolderCard from "../components/FolderCard";
import FileCard from "../components/FileCard";
import FileList from "../components/FileList";
import DetailsDialog from "../components/DetailsDialog";
import NewFolderDialog from "../components/NewFolderDialog";
import RenameDialog from "../components/RenameDialog";
import DeleteDialog from "../components/DeleteDialog";
import ContextMenu from "../components/ContextMenu";
import { StorageSkeleton } from "../components/StorageSkeleton";

import { useAuth } from "@clerk/nextjs";
import * as StorageApi from "@/lib/storageApi";
import { FileItem } from "../types";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { useOrgStore } from "@/hooks/useOrgStore";
import { OrganizationState } from "@/components/OrganizationState";
import { toast } from "sonner";

function StoragePageContent() {
  const { selectedOrgId, orgs, setSelectedOrgId } = useOrgStore();
  const router = useRouter();
  const params = useParams();
  // Normalise the catch-all path segments
  const _rawPath = Array.isArray(params.path)
    ? (params.path as string[])
    : params.path
      ? [params.path as string]
      : [];
  const orgIds = orgs.map((o) => String(o.id));
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const [usagePercent, setUsagePercent] = useState(0);
  const [usedBytes, setUsedBytes] = useState(0);

  // ── Navigation State — bootstrapped from URL path ───────────────────────────
  // URL shape (folder names, not IDs):
  //   /storage                     ← My Drive root
  //   /storage/Invoices            ← inside "Invoices"
  //   /storage/Invoices/Q1         ← nested
  //   /storage/trash               ← Trash view
  // Folder IDs are cached in sessionStorage keyed by name-path so that
  // browser back / forward can restore the correct API folder without
  // storing UUIDs in the visible URL.
  const _isTrash = _rawPath[0] === "trash";
  const _initView: "drive" | "trash" = _isTrash ? "trash" : "drive";
  const _initPathStr = _rawPath
    .filter((s) => s !== "trash")
    .map(decodeURIComponent)
    .join("/");
  const _initFolderId =
    typeof window !== "undefined" && _initPathStr
      ? sessionStorage.getItem(`storage_id:${_initPathStr}`) ?? null
      : null;

  const [currentView, setCurrentView] = useState<"drive" | "trash">(_initView);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    _initFolderId,
  );
  const [folderHistory, setFolderHistory] = useState<
    { id: string | null; name: string }[]
  >([{ id: null, name: "My Drive" }]);

  // Data State
  const [items, setItems] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // ── URL sync helper ───────────────────────────────────────────────────────
  // Pushes a clean, human-readable path entry on every in-page navigation.
  // Also caches the path→folderId mapping in sessionStorage so the ID can
  // be recovered when the browser navigates back to this URL.
  const pushNavToUrl = useCallback(
    (
      newView: "drive" | "trash",
      newHistory: { id: string | null; name: string }[],
    ) => {
      if (newView === "trash") {
        router.push("/storage/trash");
        return;
      }
      // Build path from folder names (root "My Drive" = /storage)
      const segments = newHistory
        .slice(1) // skip root
        .map((h) => encodeURIComponent(h.name));
      // Cache path → folderId at every level so back-nav can recover IDs
      newHistory.slice(1).forEach((h, i) => {
        const partialPath = newHistory
          .slice(1, i + 2)
          .map((x) => x.name)
          .join("/");
        if (h.id) sessionStorage.setItem(`storage_id:${partialPath}`, h.id);
      });
      router.push(
        `/storage${segments.length ? `/${segments.join("/")}` : ""}`,
      );
    },
    [router],
  );
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  // Clipboard state for copy/cut/paste
  const [clipboard, setClipboard] = useState<{
    item: FileItem;
    operation: "copy" | "cut";
  } | null>(null);

  // Modal State
  const [modals, setModals] = useState({
    newFolder: false,
    rename: false,
    delete: false,
    details: false,
    emptyTrash: false,
    restoreAll: false,
  });

  const [duplicateDialog, setDuplicateDialog] = useState<{
    file: File;
    existingItem: FileItem;
  } | null>(null);

  const [contextMenuViewUrl, setContextMenuViewUrl] = useState<string | null>(
    null,
  );

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileItem;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── In-memory folder cache (stale-while-revalidate) ──────────────────────
  // Key format: `${view}:${folderId ?? "root"}:${orgId ?? "none"}`
  // Persists for the entire browser session. Never triggers re-renders.
  const folderCache = useRef<Map<string, FileItem[]>>(new Map());
  // Tracks which org IDs have already had their folder hierarchy ensured this
  // session so we don't make that extra API call on every folder navigation.
  const orgEnsuredRef = useRef<Set<string>>(new Set());

  const currentItems =
    currentView === "trash"
      ? items.filter(
          (item) =>
            item.isTrashed &&
            (searchQuery
              ? item.name.toLowerCase().includes(searchQuery.toLowerCase())
              : true),
        )
      : items.filter((item) => {
          if (searchQuery) {
            // Items are already filtered by the server; just exclude trashed
            return !item.isTrashed;
          }
          return item.parentId === currentFolderId && !item.isTrashed;
        });
  const currentFolders = currentItems.filter((item) => item.type === "folder");
  const currentFiles = currentItems.filter((item) => item.type !== "folder");

  const handleSelect = (file: FileItem) => {
    setSelectedFile(file === selectedFile ? null : file);
  };

  const handleOpen = async (item: FileItem) => {
    if (item.type === "folder") {
      handleFolderClick(item);
    } else {
      try {
        const token = await getToken();
        if (!token) return;
        const url = await StorageApi.getViewUrl(token, item.id, orgIds);
        window.open(url, "_blank");
      } catch (err) {
        console.error("Open failed", err);
      }
    }
  };

  const handleFolderClick = (folder: FileItem) => {
    const newHistory = [
      ...folderHistory,
      { id: folder.id, name: folder.name },
    ];
    setCurrentFolderId(folder.id);
    setSearchQuery("");
    setFolderHistory(newHistory);
    setSelectedFile(null);
    pushNavToUrl(currentView, newHistory);
  };

  const navigateToBreadcrumb = (index: number) => {
    const newHistory = folderHistory.slice(0, index + 1);
    setSearchQuery("");
    setFolderHistory(newHistory);
    setCurrentFolderId(newHistory[newHistory.length - 1].id);
    setSelectedFile(null);
    pushNavToUrl(currentView, newHistory);
  };

  const handleBack = () => {
    if (searchQuery) {
      setSearchQuery("");
      pushNavToUrl(currentView, folderHistory);
      return;
    }

    if (currentView === "trash") {
      const driveHistory = [{ id: null, name: "My Drive" }];
      setCurrentView("drive");
      setFolderHistory(driveHistory);
      setCurrentFolderId(null);
      pushNavToUrl("drive", driveHistory);
      return;
    }
    if (folderHistory.length <= 1) return;
    const newHistory = folderHistory.slice(0, -1);
    setFolderHistory(newHistory);
    setCurrentFolderId(newHistory[newHistory.length - 1].id);
    setSelectedFile(null);
    pushNavToUrl(currentView, newHistory);
  };

  // --- Actions ---

  const loadFiles = async (showToast: boolean = false) => {
    const key = `${currentView}:${currentFolderId ?? "root"}:${selectedOrgId ?? "none"}`;
    const cached = folderCache.current.get(key);

    if (cached) {
      // ── Cache HIT: render instantly, revalidate silently in background ──
      setItems(cached);
      try {
        const token = await getToken();
        if (!token) return;
        const orgIds = orgs.map((o) => String(o.id));
        const freshData = await StorageApi.listFiles(
          token,
          currentView === "trash" ? null : currentFolderId,
          currentView === "trash",
          orgIds,
        );
        folderCache.current.set(key, freshData);
        setItems(freshData);
        loadPreviewUrls(freshData);
      } catch (err) {
        console.error("Background revalidation failed", err);
        // Silently ignore — user already sees the cached version
      }
      return;
    }

    // ── Cache MISS: show skeleton, fetch, store ──────────────────────────
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      // Ensure org folder hierarchy — only once per org per session
      if (selectedOrgId && !orgEnsuredRef.current.has(selectedOrgId)) {
        const org = orgs.find((o) => String(o.id) === String(selectedOrgId));
        if (org) {
          await StorageApi.ensureOrgFolder(token, String(org.id), org.name);
          orgEnsuredRef.current.add(selectedOrgId); // never run again for this org
        }
      }

      // Pass all user's org IDs so the server includes org files
      const orgIds = orgs.map((o) => String(o.id));

      // Run listFiles and getUsage in parallel — saves one full round trip
      const [data, usageData] = await Promise.all([
        StorageApi.listFiles(
          token,
          currentView === "trash" ? null : currentFolderId,
          currentView === "trash",
          orgIds,
        ),
        StorageApi.getUsage(token),
      ]);

      folderCache.current.set(key, data); // store in cache
      setItems(data);
      loadPreviewUrls(data);
      setUsagePercent(usageData.percentage);
      setUsedBytes(usageData.usedBytes);
    } catch (err) {
      console.error("Failed to load files", err);
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  // Removes the current folder's cache entry so the next loadFiles call
  // fetches fresh data from the server. Call this before any mutation.
  const invalidateCache = () => {
    const key = `${currentView}:${currentFolderId ?? "root"}:${selectedOrgId ?? "none"}`;
    folderCache.current.delete(key);
  };

  const loadPreviewUrls = async (files: FileItem[]) => {
    const token = await getToken();
    if (!token) return;
    const previewable = files.filter(
      (f) =>
        f.type !== "folder" &&
        (f.type === "image" ||
          f.type.startsWith("image/") ||
          f.type === "pdf" ||
          f.type === "application/pdf" ||
          f.type === "video" ||
          f.type.startsWith("video/")),
    );
    const entries = await Promise.allSettled(
      previewable.map(async (f) => {
        const url = await StorageApi.getViewUrl(token, f.id, orgIds);
        return [f.id, url] as [string, string];
      }),
    );
    const map: Record<string, string> = {};
    for (const result of entries) {
      if (result.status === "fulfilled") {
        map[result.value[0]] = result.value[1];
      }
    }
    setPreviewUrls(map);
  };

  useEffect(() => {
    loadFiles();
  }, [currentFolderId, currentView, selectedOrgId]); // Re-fetch when folder, view, or org changes

  // ── Sync state when the browser navigates back / forward ─────────────────
  // When the browser Back/Forward button fires, Next.js updates `params.path`.
  // We rebuild state from the path segments + sessionStorage ID cache.
  useEffect(() => {
    const rawPath = Array.isArray(params.path)
      ? (params.path as string[])
      : params.path
        ? [params.path as string]
        : [];

    if (rawPath[0] === "trash") {
      setCurrentView("trash");
      setFolderHistory([{ id: "trash", name: "Trash" }]);
      setCurrentFolderId(null);
      setSelectedFile(null);
      setSearchQuery("");
      return;
    }

    setCurrentView("drive");
    setSelectedFile(null);
    setSearchQuery("");

    if (rawPath.length === 0) {
      setCurrentFolderId(null);
      setFolderHistory([{ id: null, name: "My Drive" }]);
      return;
    }

    // Rebuild breadcrumb history from path names + cached IDs
    const newHistory: { id: string | null; name: string }[] = [
      { id: null, name: "My Drive" },
    ];
    for (let i = 0; i < rawPath.length; i++) {
      const name = decodeURIComponent(rawPath[i]);
      const partialPath = rawPath
        .slice(0, i + 1)
        .map(decodeURIComponent)
        .join("/");
      const id = sessionStorage.getItem(`storage_id:${partialPath}`) ?? null;
      newHistory.push({ id, name });
    }
    const lastId = newHistory[newHistory.length - 1]?.id ?? null;
    setFolderHistory(newHistory);
    setCurrentFolderId(lastId);
  }, [params.path]); // Re-runs whenever the URL path changes

  // When searchQuery changes, fire a server-side search so we get results
  // from ALL nested folders, not just the currently loaded folder level.
  useEffect(() => {
    if (!searchQuery) {
      // Search cleared — reload the current folder normally
      loadFiles();
      return;
    }
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const orgIds = orgs.map((o) => String(o.id));
        const data = await StorageApi.listFiles(
          token,
          null, // no parentId — search globally across all folders
          false,
          orgIds,
          searchQuery, // server filters by name
        );
        setItems(data);
        loadPreviewUrls(data);
      } catch (err) {
        console.error("Search failed", err);
      }
    })();
  }, [searchQuery]);

  const handleCreateFolder = async (name: string) => {
    invalidateCache();
    try {
      const token = await getToken();
      if (!token) return;
      await StorageApi.createFolder(token, name, currentFolderId);
      await loadFiles(); // Refresh
    } catch (err) {
      console.error("Failed to create folder", err);
    }
  };

  const handleRename = async (newName: string) => {
    if (!selectedFile) return;
    invalidateCache();
    try {
      const token = await getToken();
      if (!token) return;
      await StorageApi.renameItem(token, selectedFile.id, newName);
      setSelectedFile(null);
      await loadFiles();
    } catch (err) {
      console.error("Failed to rename", err);
    }
  };

  const handleDelete = async () => {
    if (!selectedFile) return;

    const deletePromise = async () => {
      invalidateCache();
      const token = await getToken();
      if (!token) throw new Error("Authentication error");
      await StorageApi.trashItem(token, selectedFile.id, orgIds);
      setSelectedFile(null);
      setModals((prev) => ({ ...prev, delete: false }));
      await loadFiles(false);
    };

    toast.promise(deletePromise(), {
      loading: "Deleting...",
      success: "Done",
      error: "Failed to delete",
    });
  };

  const handleRestore = async () => {
    if (!selectedFile) return;
    const token = await getToken();
    if (!token) return;
    await StorageApi.restoreItem(token, selectedFile.id, orgIds);
    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedFile.id ? { ...item, isTrashed: false } : item,
      ),
    );
    setSelectedFile(null);
  };

  const handleEmptyTrash = async () => {
    invalidateCache();
    try {
      const token = await getToken();
      if (!token) return;
      await StorageApi.emptyTrash(token, orgIds);
      setModals((prev) => ({ ...prev, emptyTrash: false }));
      await loadFiles();
    } catch (err) {
      console.error("Failed to empty trash", err);
    }
  };

  const handleDeleteForever = async () => {
    if (!selectedFile) return;

    const deletePromise = async () => {
      invalidateCache();
      const token = await getToken();
      if (!token) throw new Error("Authentication error");
      await StorageApi.deleteItem(token, selectedFile.id, orgIds);
      setSelectedFile(null);
      setModals((prev) => ({ ...prev, delete: false }));
      await loadFiles(false);
    };

    toast.promise(deletePromise(), {
      loading: "Deleting permanently...",
      success: "Done",
      error: "Failed to permanently delete",
    });
  };

  const handleRestoreAll = async () => {
    invalidateCache();
    try {
      const token = await getToken();
      if (!token) return;
      const trashedItems = items.filter((item) => item.isTrashed);
      await Promise.all(
        trashedItems.map((item) =>
          StorageApi.restoreItem(token, item.id, orgIds),
        ),
      );
      setModals((prev) => ({ ...prev, restoreAll: false }));
      await loadFiles();
    } catch (err) {
      console.error("Failed to restore all", err);
    }
  };

  const handleCopyLink = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(
      `https://drive.example.com/file/${selectedFile.id}`,
    );
    console.log("Link copied to clipboard");
  };

  const handleContextCopyLink = async (item: FileItem) => {
    try {
      const token = await getToken();
      if (!token) return;
      const url = await StorageApi.getViewUrl(token, item.id, orgIds);
      navigator.clipboard.writeText(url);
    } catch (err) {
      console.error("Get link failed", err);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Check for a name collision in the current folder
    const collision = items.find(
      (item) =>
        item.name === file.name &&
        item.parentId === currentFolderId &&
        !item.isTrashed &&
        item.type !== "folder",
    );

    if (collision) {
      setDuplicateDialog({ file, existingItem: collision });
      return;
    }

    doUpload(file, undefined);
  };

  const doUpload = (file: File, mode: "replace" | "keep" | undefined) => {
    const uploadPromise = async () => {
      invalidateCache();
      const token = await getToken();
      if (!token) throw new Error("Authentication error");
      await StorageApi.uploadFile(token, file, currentFolderId, mode);
      await loadFiles(false);
    };

    toast.promise(uploadPromise(), {
      loading: "Uploading...",
      success: "Done",
      error: "Upload failed",
    });
  };

  const handleDuplicateReplace = () => {
    if (!duplicateDialog) return;
    setDuplicateDialog(null);
    doUpload(duplicateDialog.file, "replace");
  };

  const handleDuplicateKeep = () => {
    if (!duplicateDialog) return;
    setDuplicateDialog(null);
    doUpload(duplicateDialog.file, "keep");
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setSelectedFile(item);
    setContextMenu({ x: e.clientX, y: e.clientY, item });
    setContextMenuViewUrl(null);
    if (item.type !== "folder") {
      (async () => {
        try {
          const token = await getToken();
          if (!token) return;
          const url = await StorageApi.getViewUrl(token, item.id, orgIds);
          setContextMenuViewUrl(url);
        } catch (err) {
          console.error("Failed to pre-fetch view URL", err);
        }
      })();
    }
  };

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu) return;
    const { item } = contextMenu;

    switch (action) {
      case "open":
        if (item.type === "folder") {
          handleFolderClick(item);
        } else if (contextMenuViewUrl) {
          window.open(contextMenuViewUrl, "_blank");
        }
        break;
      case "rename":
        setModals((prev) => ({ ...prev, rename: true }));
        break;
      case "share":
        console.log("Share action triggered for", item.name);
        break;
      case "link":
        handleContextCopyLink(item);
        break;
      case "download":
        (async () => {
          try {
            const token = await getToken();
            if (!token) return;
            const url = await StorageApi.getDownloadUrl(token, item.id, orgIds);
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = item.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
          } catch (err) {
            console.error("Download failed", err);
          }
        })();
        break;
      case "delete":
        setModals((prev) => ({ ...prev, delete: true }));
        break;
      case "info":
      case "details":
        setModals((prev) => ({ ...prev, details: true }));
        break;
      case "restore":
        handleRestore();
        break;
      case "copy":
        handleCopy(item);
        break;
      case "cut":
        handleCut(item);
        break;
      case "paste":
        handlePaste();
        break;
    }
    setContextMenu(null);
  };

  const handleTrashClick = () => {
    const trashHistory = [{ id: "trash", name: "Trash" }];
    setCurrentView("trash");
    setFolderHistory(trashHistory);
    setSelectedFile(null);
    setSearchQuery(""); // Clear search when switching to trash
    pushNavToUrl("trash", trashHistory);
  };

  const handleCopy = (item?: FileItem) => {
    const target = item || selectedFile;
    if (!target) return;
    setClipboard({ item: target, operation: "copy" });
  };

  const handleCut = (item?: FileItem) => {
    const target = item || selectedFile;
    if (!target) return;
    setClipboard({ item: target, operation: "cut" });
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    invalidateCache();
    try {
      const token = await getToken();
      if (!token) return;

      if (clipboard.operation === "cut") {
        // Move: update parentId to current folder
        // await StorageApi.renameItem(
        //   token,
        //   clipboard.item.id,
        //   clipboard.item.name,
        // );
        // Actually we need moveItem — see storageApi section below
        await StorageApi.moveItem(token, clipboard.item.id, currentFolderId);
        setClipboard(null); // Clear clipboard after cut-paste
      } else {
        // Copy: call copyItem API — see storageApi section below
        await StorageApi.copyItem(token, clipboard.item.id, currentFolderId);
        // Clipboard stays for multiple pastes
      }
      await loadFiles();
    } catch (err) {
      console.error("Paste failed", err);
    }
  };

  if (orgs.length === 0 || !selectedOrgId) {
    return (
      <div className="flex flex-1 min-h-0 relative">
        <OrganizationState
          hasOrganizations={orgs.length > 0}
          hasSelectedOrg={!!selectedOrgId}
          orgs={orgs}
          selectedOrgId={selectedOrgId}
          onOrganizationSelect={setSelectedOrgId}
          noOrgDescription="Create or join an organization to manage storage."
          selectOrgDescription="Please select an organization to view storage."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto relative ">
      <div className="p-4 md:p-6">
        {/* ... inputs/nav ... */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
        />

        <div className="flex flex-col gap-1 mb-5">
          <div className="flex items-center justify-between">
            {/* H1 color fixed */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {searchQuery
                ? `Search results for "${searchQuery}"`
                : folderHistory[folderHistory.length - 1].name}
            </h1>
            <span className="text-sm text-gray-500">
              {currentItems.length} items
            </span>
          </div>
        </div>

        <Toolbar
          viewMode={viewMode}
          onViewChange={setViewMode}
          onNewFolder={() =>
            setModals((prev) => ({ ...prev, newFolder: true }))
          }
          onUpload={handleUploadClick}
          onToggleDetails={() =>
            setModals((prev) => ({ ...prev, details: true }))
          }
          isDetailsOpen={false}
          onRename={() => setModals((prev) => ({ ...prev, rename: true }))}
          onDelete={() => setModals((prev) => ({ ...prev, delete: true }))}
          onCopyLink={handleCopyLink}
          onTrashClick={handleTrashClick}
          hasSelection={!!selectedFile}
          pageView={currentView}
          onEmptyTrash={() =>
            setModals((prev) => ({ ...prev, emptyTrash: true }))
          }
          onRestore={handleRestore}
          onRestoreAll={() =>
            setModals((prev) => ({ ...prev, restoreAll: true }))
          }
          onDeleteForever={handleDeleteForever}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          usagePercent={usagePercent}
          usedBytes={usedBytes}
          clipboardItemName={clipboard?.item.name ?? null}
          onPaste={handlePaste}
        />

        {loading ? (
          <StorageSkeleton viewMode={viewMode} />
        ) : viewMode === "grid" ? (
          <div
            className="flex-1 overflow-y-auto min-h-0 space-y-8 pb-10"
            onContextMenu={(e) => {
              e.preventDefault();
            }}
          >
            {currentFolders.length > 0 && (
              <section>
                {/* Section Header Fixed */}
                <br />
                <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-2">
                  Folders
                  <span className="bg-gray-100 dark:bg-white/5 text-xs px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-500">
                    {currentFolders.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {currentFolders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      selected={selectedFile?.id === folder.id}
                      onClick={() => handleSelect(folder)}
                      onDoubleClick={() => handleFolderClick(folder)}
                      onContextMenu={(e) => handleContextMenu(e, folder)}
                    />
                  ))}
                </div>
              </section>
            )}

            {currentFiles.length > 0 && (
              <section>
                {/* Section Header Fixed */}
                <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-2">
                  Files
                  <span className="bg-gray-100 dark:bg-white/5 text-xs px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-500">
                    {currentFiles.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {currentFiles.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      previewUrl={previewUrls[file.id]}
                      selected={selectedFile?.id === file.id}
                      onClick={() => handleSelect(file)}
                      onDoubleClick={() => handleOpen(file)}
                      onContextMenu={(e) => handleContextMenu(e, file)}
                    />
                  ))}
                </div>
              </section>
            )}

            {currentItems.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-gray-500 flex-col gap-2 mt-20">
                <div className="text-lg font-medium">This folder is empty</div>
                <div className="text-sm">
                  Use the &quot;New Folder&quot; button to create one
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0 pb-10 bg-card rounded-xl border border-border mt-4">
            <FileList
              items={currentItems}
              selectedId={selectedFile?.id}
              onSelect={handleSelect}
              onDoubleClick={handleOpen}
              onContextMenu={handleContextMenu}
            />
          </div>
        )}

        {/* Modals and Overlays */}
        <NewFolderDialog
          isOpen={modals.newFolder}
          onClose={() => setModals((prev) => ({ ...prev, newFolder: false }))}
          onCreate={handleCreateFolder}
        />

        <RenameDialog
          isOpen={modals.rename}
          onClose={() => setModals((prev) => ({ ...prev, rename: false }))}
          onRename={handleRename}
          currentName={selectedFile?.name || ""}
        />

        <DeleteDialog
          isOpen={modals.delete}
          onClose={() => setModals((prev) => ({ ...prev, delete: false }))}
          onDelete={
            currentView === "trash" ? handleDeleteForever : handleDelete
          }
          itemName={selectedFile?.name || ""}
        />
        <DeleteDialog
          isOpen={modals.emptyTrash}
          onClose={() => setModals((prev) => ({ ...prev, emptyTrash: false }))}
          onDelete={handleEmptyTrash}
          itemName=""
          title="Empty Trash?"
          description="This will permanently delete all items in Trash. This cannot be undone."
          confirmLabel="Empty Trash"
          confirmClass="bg-red-500 hover:bg-red-600"
        />

        <DeleteDialog
          isOpen={modals.restoreAll}
          onClose={() => setModals((prev) => ({ ...prev, restoreAll: false }))}
          onDelete={handleRestoreAll}
          itemName=""
          title="Restore All Items?"
          description="This will restore all trashed items back to My Drive."
          confirmLabel="Restore All"
          confirmClass="bg-emerald-500 hover:bg-emerald-600"
        />

        <DetailsDialog
          isOpen={modals.details}
          onClose={() => setModals((prev) => ({ ...prev, details: false }))}
          file={selectedFile}
          onCopyLink={() => selectedFile && handleContextCopyLink(selectedFile)}
        />

        {duplicateDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
              <h2 className="text-lg font-semibold mb-2">
                File already exists
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                A file named{" "}
                <span className="font-medium text-foreground">
                  &quot;{duplicateDialog.file.name}&quot;
                </span>{" "}
                already exists in this folder. What would you like to do?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDuplicateReplace}
                  className="w-full py-2 px-4 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 text-sm font-medium transition-colors"
                >
                  Replace existing file
                </button>
                <button
                  onClick={handleDuplicateKeep}
                  className="w-full py-2 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors shadow-sm"
                >
                  Keep both
                </button>
                <button
                  onClick={() => setDuplicateDialog(null)}
                  className="w-full py-2 px-4 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onAction={handleContextMenuAction}
            isTrashed={contextMenu.item.isTrashed}
            clipboardItem={clipboard?.item}
            clipboardOp={clipboard?.operation}
          />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return <StoragePageContent />;
}
