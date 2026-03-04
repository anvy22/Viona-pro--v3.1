"use client";
import { useState, useRef, useEffect } from "react";
import Toolbar from "./components/Toolbar";
import FolderCard from "./components/FolderCard";
import FileCard from "./components/FileCard";
import FileList from "./components/FileList";
import DetailsDialog from "./components/DetailsDialog";
import NewFolderDialog from "./components/NewFolderDialog";
import RenameDialog from "./components/RenameDialog";
import DeleteDialog from "./components/DeleteDialog";
import ContextMenu from "./components/ContextMenu";
import Breadcrumbs from "./components/Breadcrumbs";

import { useAuth } from "@clerk/nextjs";
import * as StorageApi from "@/lib/storageApi";
import { FileItem } from "./types";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default function Home() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentView, setCurrentView] = useState<"drive" | "trash">("drive");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const [usagePercent, setUsagePercent] = useState(0);
  const [usedBytes, setUsedBytes] = useState(0);

  // Navigation State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<
    { id: string | null; name: string }[]
  >([{ id: null, name: "My Drive" }]);

  // Data State
  const [items, setItems] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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
            return (
              !item.isTrashed &&
              item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
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
        const url = await StorageApi.getViewUrl(token, item.id);
        window.open(url, "_blank");
      } catch (err) {
        console.error("Open failed", err);
      }
    }
  };

  const handleFolderClick = (folder: FileItem) => {
    setCurrentFolderId(folder.id);
    setSearchQuery(""); // Clear search when navigating
    setFolderHistory((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedFile(null);
  };

  const navigateToBreadcrumb = (index: number) => {
    const newHistory = folderHistory.slice(0, index + 1);
    setSearchQuery(""); // Clear search when navigating
    setFolderHistory(newHistory);
    setCurrentFolderId(newHistory[newHistory.length - 1].id);
    setSelectedFile(null);
  };

  const handleBack = () => {
    if (searchQuery) {
      setSearchQuery("");
      return;
    }

    if (currentView === "trash") {
      setCurrentView("drive");
      setFolderHistory([{ id: null, name: "My Drive" }]);
      setCurrentFolderId(null);
      return;
    }
    if (folderHistory.length <= 1) return;
    const newHistory = folderHistory.slice(0, -1);
    setFolderHistory(newHistory);
    setCurrentFolderId(newHistory[newHistory.length - 1].id);
    setSelectedFile(null);
  };

  // --- Actions ---

  const loadFiles = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const data = await StorageApi.listFiles(
        token,
        currentView === "trash" ? null : currentFolderId,
        currentView === "trash",
      );
      setItems(data);
      const usageData = await StorageApi.getUsage(token);
      setUsagePercent(usageData.percentage);
      setUsedBytes(usageData.usedBytes);
    } catch (err) {
      console.error("Failed to load files", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [currentFolderId, currentView]); // Re-fetch when folder or view changes

  const handleCreateFolder = async (name: string) => {
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
    try {
      const token = await getToken();
      if (!token) return;
      await StorageApi.trashItem(token, selectedFile.id);
      setSelectedFile(null);
      setModals((prev) => ({ ...prev, delete: false }));
      await loadFiles();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) return;
    const token = await getToken();
    if (!token) return;
    await StorageApi.restoreItem(token, selectedFile.id);
    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedFile.id ? { ...item, isTrashed: false } : item,
      ),
    );
    setSelectedFile(null);
  };

  const handleEmptyTrash = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      await StorageApi.emptyTrash(token);
      setModals((prev) => ({ ...prev, emptyTrash: false }));
      await loadFiles();
    } catch (err) {
      console.error("Failed to empty trash", err);
    }
  };

  const handleDeleteForever = async () => {
    if (!selectedFile) return;
    try {
      const token = await getToken();
      if (!token) return;
      await StorageApi.deleteItem(token, selectedFile.id);
      setSelectedFile(null);
      setModals((prev) => ({ ...prev, delete: false }));
      await loadFiles();
    } catch (err) {
      console.error("Failed to permanently delete", err);
    }
  };

  const handleRestoreAll = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const trashedItems = items.filter((item) => item.isTrashed);
      await Promise.all(
        trashedItems.map((item) => StorageApi.restoreItem(token, item.id)),
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
      const url = await StorageApi.getViewUrl(token, item.id);
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
    try {
      const token = await getToken();
      if (!token) return;
      await StorageApi.uploadFile(token, file, currentFolderId);
      await loadFiles();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
          const url = await StorageApi.getViewUrl(token, item.id);
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
            const url = await StorageApi.getDownloadUrl(token, item.id);
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
    setCurrentView("trash");
    setFolderHistory([{ id: "trash", name: "Trash" }]);
    setSelectedFile(null);
    setSearchQuery(""); // Clear search when switching to trash
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

  return (
          <div className="flex-1 overflow-y-auto relative">
            <div className="p-4 md:p-6">
              {loading && (
                <div className="fixed top-[70px] left-0 right-0 flex justify-center text-gray-400 text-sm pointer-events-none z-50">
                  Loading...
                </div>
              )}

              {/* ... inputs/nav ... */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
              />

              <div className="flex flex-col gap-4">
                <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <button
                    onClick={handleBack}
                    disabled={
                      folderHistory.length <= 1 &&
                      currentView !== "trash" &&
                      !searchQuery
                    }
                    className={cn(
                      "p-1 rounded-full transition-colors",
                      // Background colors fixed for light/dark
                      "hover:bg-gray-200 dark:hover:bg-white/5",
                      folderHistory.length <= 1 &&
                        currentView !== "trash" &&
                        !searchQuery
                        ? "opacity-30 cursor-not-allowed"
                        : // Text colors fixed for light/dark
                          "text-gray-600 dark:text-gray-200",
                    )}
                    title="Go Back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-px h-4 bg-gray-300 dark:bg-sidebar-border" />

                  {folderHistory.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => navigateToBreadcrumb(index)}
                      className={cn(
                        "transition-colors px-1",
                        // Hover text color fixed
                        "hover:text-gray-900 dark:hover:text-white",
                        index === folderHistory.length - 1
                          ? // Active text color fixed
                            "text-gray-900 dark:text-white font-medium"
                          : "",
                      )}
                    >
                      {item.name} {index < folderHistory.length - 1 && " / "}
                    </button>
                  ))}
                </nav>

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
                <br />
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
                onRename={() =>
                  setModals((prev) => ({ ...prev, rename: true }))
                }
                onDelete={() =>
                  setModals((prev) => ({ ...prev, delete: true }))
                }
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

              {viewMode === "grid" ? (
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
                      <div className="text-lg font-medium">
                        This folder is empty
                      </div>
                      <div className="text-sm">
                        Use the "New Folder" button to create one
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto min-h-0 pb-10 bg-card rounded-xl border border-border">
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
                onClose={() =>
                  setModals((prev) => ({ ...prev, newFolder: false }))
                }
                onCreate={handleCreateFolder}
              />

              <RenameDialog
                isOpen={modals.rename}
                onClose={() =>
                  setModals((prev) => ({ ...prev, rename: false }))
                }
                onRename={handleRename}
                currentName={selectedFile?.name || ""}
              />

              <DeleteDialog
                isOpen={modals.delete}
                onClose={() =>
                  setModals((prev) => ({ ...prev, delete: false }))
                }
                onDelete={
                  currentView === "trash" ? handleDeleteForever : handleDelete
                }
                itemName={selectedFile?.name || ""}
              />
              <DeleteDialog
                isOpen={modals.emptyTrash}
                onClose={() =>
                  setModals((prev) => ({ ...prev, emptyTrash: false }))
                }
                onDelete={handleEmptyTrash}
                itemName=""
                title="Empty Trash?"
                description="This will permanently delete all items in Trash. This cannot be undone."
                confirmLabel="Empty Trash"
                confirmClass="bg-red-500 hover:bg-red-600"
              />

              <DeleteDialog
                isOpen={modals.restoreAll}
                onClose={() =>
                  setModals((prev) => ({ ...prev, restoreAll: false }))
                }
                onDelete={handleRestoreAll}
                itemName=""
                title="Restore All Items?"
                description="This will restore all trashed items back to My Drive."
                confirmLabel="Restore All"
                confirmClass="bg-emerald-500 hover:bg-emerald-600"
              />

              <DetailsDialog
                isOpen={modals.details}
                onClose={() =>
                  setModals((prev) => ({ ...prev, details: false }))
                }
                file={selectedFile}
                onCopyLink={() =>
                  selectedFile && handleContextCopyLink(selectedFile)
                }
              />

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
