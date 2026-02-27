import { upload } from "@vercel/blob/client";
import type { FileAttachment, MessageAttachment } from "@/types/attachment";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/** Validate file before upload. Returns error message or null. */
export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 50MB)`;
  }
  return null;
}

/** Upload a file to Vercel Blob via client-side upload. */
export async function uploadFile(
  apiBaseUrl: string,
  token: string,
  projectId: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<{ blobUrl: string; contentType: string; size: number }> {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: `${apiBaseUrl}/api/projects/${projectId}/attachments/upload`,
    clientPayload: JSON.stringify({ token, filename: file.name }),
    multipart: file.size > 4.5 * 1024 * 1024,
    onUploadProgress: (event) => {
      onProgress?.(event.percentage);
    },
  });

  return {
    blobUrl: blob.url,
    contentType: blob.contentType,
    size: file.size,
  };
}

/** Persist attachment metadata to server after successful upload. */
export async function persistAttachment(
  apiBaseUrl: string,
  token: string,
  projectId: string,
  data: {
    messageId?: string;
    filename: string;
    mimeType: string;
    fileSize: number;
    blobUrl: string;
  },
): Promise<FileAttachment | null> {
  const res = await fetch(`${apiBaseUrl}/api/projects/${projectId}/attachments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) return null;
  const json = await res.json();
  return json.data as FileAttachment;
}

/** Fire-and-forget: link attachments to a message after it's sent. */
export function linkAttachmentsToMessage(
  apiBaseUrl: string,
  token: string,
  projectId: string,
  attachmentIds: string[],
  messageId: string,
): void {
  for (const attId of attachmentIds) {
    fetch(`${apiBaseUrl}/api/projects/${projectId}/attachments/${attId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messageId }),
    }).catch(() => {});
  }
}

/** Fetch attachments for a project (optionally filtered by messageId). */
export async function fetchAttachments(
  apiBaseUrl: string,
  token: string,
  projectId: string,
  messageId?: string,
): Promise<FileAttachment[]> {
  const params = new URLSearchParams();
  if (messageId) params.set("messageId", messageId);

  const qs = params.toString();
  const url = `${apiBaseUrl}/api/projects/${projectId}/attachments${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  const json = await res.json();
  return json.data as FileAttachment[];
}

/** Delete an attachment. */
export async function deleteAttachment(
  apiBaseUrl: string,
  token: string,
  projectId: string,
  attachmentId: string,
): Promise<boolean> {
  const res = await fetch(
    `${apiBaseUrl}/api/projects/${projectId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return res.ok;
}

/** Format file size for display. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Check if a MIME type is a displayable image. */
export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/") && !mimeType.includes("svg");
}

const TEXT_EXTENSIONS = new Set([
  "txt", "ts", "tsx", "js", "jsx", "py", "json", "md", "log", "csv",
  "yaml", "yml", "toml", "rs", "go", "java", "html", "css", "xml",
  "sql", "sh", "bash", "zsh", "env", "cfg", "ini", "conf", "diff",
  "patch", "c", "cpp", "h", "hpp", "rb", "php", "swift", "kt",
]);

/** Check if a MIME type represents a text/code file. */
export function isTextMime(mimeType: string): boolean {
  if (mimeType.startsWith("text/")) return true;
  if (mimeType === "application/json") return true;
  if (mimeType === "application/xml") return true;
  if (mimeType === "application/javascript") return true;
  if (mimeType === "application/typescript") return true;
  if (mimeType === "application/x-yaml") return true;
  if (mimeType === "application/toml") return true;
  return false;
}

/** Check if filename extension is a known text type (fallback for generic mimes). */
export function isTextFilename(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return TEXT_EXTENSIONS.has(ext);
}

/** Fetch text content of a file from its blob URL. Returns null for non-text or on error. */
export async function fetchAttachmentContent(
  blobUrl: string,
  mimeType: string,
  filename: string,
  maxBytes: number = 100 * 1024,
): Promise<string | null> {
  if (!isTextMime(mimeType) && !isTextFilename(filename)) return null;

  try {
    const res = await fetch(blobUrl);
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > maxBytes) {
      return text.slice(0, maxBytes) + "\n... (truncated)";
    }
    return text;
  } catch {
    return null;
  }
}

/** Convert a MessageAttachment[] to a lightweight subset (for Ably payload). */
export function toMessageAttachments(attachments: FileAttachment[]): MessageAttachment[] {
  return attachments.map((a) => ({
    id: a.id,
    filename: a.filename,
    mimeType: a.mimeType,
    fileSize: a.fileSize,
    blobUrl: a.blobUrl,
  }));
}
