import { FileText, Image as ImageIcon, Film, Music, Archive, Folder } from "lucide-react";

export interface FileItem {
    id: string;
    name: string;
    type: string;         // "folder" | "image" | "pdf" | "document" etc.
    size: string | number;
    mimeType?: string;
    parentId: string | null;
    isTrashed?: boolean;
    isStarred?: boolean;
    createdAt?: string;
    updatedAt?: string;
    owner?: string;
}

export const getIconForType = (type: string) => {
    switch (type) {
        case "folder": return Folder;
        case "image": return ImageIcon;
        case "video": return Film;
        case "audio": return Music;
        case "archive": return Archive;
        case "pdf": return FileText;
        case "document": return FileText;
        default: return FileText;
    }
};
