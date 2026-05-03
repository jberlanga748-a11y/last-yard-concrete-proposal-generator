import { isSupabaseConfigured, supabase } from "../../supabaseClient.js";
import { canUseCloudSync, hasTextValue } from "./cloudSync.js";
import { ensureCloudCompany } from "./companyCloud.js";

export const proposalAssetsBucket = "last-yard-proposal-assets";

export function getAssetLocalStorageReason(authUser) {
  if (!isSupabaseConfigured || !supabase) {
    return "Supabase is not configured.";
  }

  if (!authUser?.id) {
    return "Sign in to upload images to cloud.";
  }

  return "cloud storage is unavailable.";
}

export function getImageAssetSource(asset = {}) {
  if (hasTextValue(asset.dataUrl)) {
    return asset.dataUrl;
  }

  if (hasTextValue(asset.src) && isDataUrl(asset.src)) {
    return asset.src;
  }

  if (hasTextValue(asset.imageSrc) && isDataUrl(asset.imageSrc)) {
    return asset.imageSrc;
  }

  if (hasTextValue(asset.publicUrl)) {
    return asset.publicUrl;
  }

  if (hasTextValue(asset.signedUrl)) {
    return asset.signedUrl;
  }

  if (hasTextValue(asset.src)) {
    return asset.src;
  }

  if (hasTextValue(asset.imageSrc)) {
    return asset.imageSrc;
  }

  if (hasTextValue(asset.storagePath) && isSupabaseConfigured && supabase) {
    return getStoragePublicUrl(asset.storagePath);
  }

  return "";
}

export function getImageAssetLabel(asset = {}) {
  if (hasTextValue(asset.storagePath)) {
    return "Cloud image";
  }

  if (hasTextValue(asset.dataUrl) || isDataUrl(asset.src) || isDataUrl(asset.imageSrc)) {
    return "Local image";
  }

  return "No image";
}

export function getStoragePublicUrl(storagePath) {
  if (!hasTextValue(storagePath) || !isSupabaseConfigured || !supabase) {
    return "";
  }

  const { data } = supabase.storage.from(proposalAssetsBucket).getPublicUrl(storagePath);
  return data?.publicUrl || "";
}

export function isDataUrl(value) {
  return String(value || "").startsWith("data:");
}

export async function uploadProposalAssetToCloud(file, { area, companySettings, companyUser, fileStem, proposalId, companyDeps = {} }) {
  if (!canUseCloudSync(companyUser)) {
    throw new Error("Sign in to upload images to cloud storage.");
  }

  if (!file?.type?.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  const activeUser = await getActiveSupabaseUser();
  const companyRecord = await ensureCloudCompany(activeUser, companySettings, companyDeps);
  const safeArea = area === "plans" ? "plans" : "featured";
  const timestamp = Date.now();
  const extension = getFileExtension(file);
  const safeFileStem = sanitizeStoragePathSegment(fileStem || file.name || "image");
  const proposalPathSegment = sanitizeStoragePathSegment(proposalId || "unsaved");
  const fileName = `${safeFileStem}-${timestamp}.${extension}`;
  const storagePath = `company/${companyRecord.id}/proposals/${proposalPathSegment}/${safeArea}/${fileName}`;
  const uploadOptions = {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
    upsert: false,
  };
  const { data, error } = await supabase.storage.from(proposalAssetsBucket).upload(storagePath, file, uploadOptions);

  if (error) {
    console.error("Supabase Storage upload failed:", {
      bucket: proposalAssetsBucket,
      error,
      path: storagePath,
    });
    throw new Error(formatStorageUploadError(error));
  }

  if (!data?.path) {
    const missingPathError = new Error("Supabase Storage upload did not return an uploaded file path.");
    console.error("Supabase Storage upload returned no file path:", {
      bucket: proposalAssetsBucket,
      data,
      path: storagePath,
    });
    throw missingPathError;
  }

  const uploadedPath = data.path || storagePath;
  const publicUrl = getStoragePublicUrl(uploadedPath);

  return {
    companyId: companyRecord.id,
    dataUrl: "",
    fileName: file.name || `${safeFileStem}.${extension}`,
    fileType: file.type || "image/jpeg",
    publicUrl,
    signedUrl: "",
    src: publicUrl,
    storagePath: uploadedPath,
    uploadedAt: new Date().toISOString(),
  };
}

export async function uploadSubmittedPacketPdfToCloud(file, { companySettings, companyUser, packetRecordId, proposalId, companyDeps = {} }) {
  if (!canUseCloudSync(companyUser)) {
    throw new Error("PDF file archive requires cloud sign-in.");
  }

  if (!isPdfFile(file)) {
    throw new Error("Choose a PDF file.");
  }

  const activeUser = await getActiveSupabaseUser();
  const companyRecord = await ensureCloudCompany(activeUser, companySettings, companyDeps);
  const timestamp = Date.now();
  const safePacketRecordId = sanitizeStoragePathSegment(packetRecordId || "packet-record");
  const proposalPathSegment = sanitizeStoragePathSegment(proposalId || "unsaved");
  const storagePath = `company/${companyRecord.id}/proposals/${proposalPathSegment}/submitted-packets/${safePacketRecordId}-${timestamp}.pdf`;
  const uploadOptions = {
    cacheControl: "3600",
    contentType: file.type || "application/pdf",
    upsert: false,
  };
  const { data, error } = await supabase.storage.from(proposalAssetsBucket).upload(storagePath, file, uploadOptions);

  if (error) {
    console.error("Supabase Storage PDF upload failed:", {
      bucket: proposalAssetsBucket,
      error,
      path: storagePath,
    });
    throw new Error(formatStorageUploadError(error));
  }

  if (!data?.path) {
    const missingPathError = new Error("Supabase Storage PDF upload did not return an uploaded file path.");
    console.error("Supabase Storage PDF upload returned no file path:", {
      bucket: proposalAssetsBucket,
      data,
      path: storagePath,
    });
    throw missingPathError;
  }

  const uploadedPath = data.path || storagePath;
  const publicUrl = getStoragePublicUrl(uploadedPath);

  return {
    fileName: file.name || `${safePacketRecordId}.pdf`,
    fileSize: file.size || 0,
    fileType: file.type || "application/pdf",
    publicUrl,
    storagePath: uploadedPath,
    uploadedAt: new Date().toISOString(),
    uploadedByEmail: activeUser.email || "",
    uploadedByUserId: activeUser.id || "",
  };
}

export async function getActiveSupabaseUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Supabase auth session lookup failed before asset upload:", error);
    throw new Error(formatStorageUploadError(error));
  }

  const user = data?.session?.user;

  if (!user?.id) {
    throw new Error("Sign in to upload images to cloud storage.");
  }

  return user;
}

export async function createLocalImageAsset(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  const dataUrl = await readFileAsDataUrl(file);

  return {
    dataUrl,
    fileName: file.name || "local-image",
    fileType: file.type || "image/jpeg",
    publicUrl: "",
    signedUrl: "",
    src: dataUrl,
    storagePath: "",
    uploadedAt: new Date().toISOString(),
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected image file."));
    reader.readAsDataURL(file);
  });
}

function getFileExtension(file) {
  const nameExtension = String(file?.name || "").split(".").pop()?.toLowerCase();

  if (nameExtension && /^[a-z0-9]{2,5}$/.test(nameExtension)) {
    return nameExtension === "jpeg" ? "jpg" : nameExtension;
  }

  const mimeExtension = String(file?.type || "").split("/").pop()?.toLowerCase();

  if (mimeExtension && /^[a-z0-9]{2,5}$/.test(mimeExtension)) {
    return mimeExtension === "jpeg" ? "jpg" : mimeExtension;
  }

  return "jpg";
}

function isPdfFile(file) {
  return file?.type === "application/pdf" || String(file?.name || "").toLowerCase().endsWith(".pdf");
}

export function sanitizeStoragePathSegment(value) {
  return String(value || "asset")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "asset";
}

export function formatStorageUploadError(error) {
  if (!error) {
    return "Unknown storage upload error.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (hasTextValue(error.message)) {
    return error.message;
  }

  if (hasTextValue(error.error_description)) {
    return error.error_description;
  }

  if (hasTextValue(error.error)) {
    return error.error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown storage upload error.";
  }
}
