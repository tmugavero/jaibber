export interface FileAttachment {
  id: string;
  projectId: string;
  messageId: string | null;
  uploadedBy: string;
  uploaderName: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  blobUrl: string;
  createdAt: string;
}

/** Pending attachment during upload — client-side only. */
export interface PendingAttachment {
  id: string;
  file: File;
  filename: string;
  mimeType: string;
  fileSize: number;
  blobUrl?: string;
  progress: number;
  status: "uploading" | "uploaded" | "error";
  error?: string;
}

/** Lightweight attachment info carried on messages and Ably payloads. */
export interface MessageAttachment {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  blobUrl: string;
}
