import { isSupabaseConfigured, supabase } from "../../supabaseClient.js";
import { canUseCloudSync, hasTextValue } from "./cloudSync.js";
import { ensureCloudCompany } from "./companyCloud.js";

export const proposalAssetsBucket = "last-yard-proposal-assets";
const megabyte = 1024 * 1024;
const featuredPhotoWarningSize = 8 * megabyte;
const planImageWarningSize = 15 * megabyte;
const imageHardLimitSize = 25 * megabyte;
const pdfWarningSize = 25 * megabyte;
const compressibleImageTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const supportedImageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "tif", "tiff", "heic", "heif"]);

export const imageUploadProfiles = {
  featured: {
    label: "featured photo",
    maxDimension: 2000,
    quality: 0.85,
    warningSize: featuredPhotoWarningSize,
  },
  plan: {
    label: "plan image",
    maxDimension: 3500,
    quality: 0.9,
    warningSize: planImageWarningSize,
  },
};

export function getAssetLocalStorageReason(authUser) {
  if (!isSupabaseConfigured || !supabase) {
    return "Local image only - Supabase is not configured. Sign in/save to cloud for access on other devices when cloud is available.";
  }

  if (!authUser?.id) {
    return "Local image only - sign in/save to cloud for access on other devices.";
  }

  return "Local image only - cloud storage is unavailable. Save to cloud before sharing from another device.";
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

export function validateImageUploadFile(file, { kind = "featured" } = {}) {
  if (!file) {
    throw new Error("Choose an image file.");
  }

  if (!isSupportedImageFile(file)) {
    throw new Error("Unsupported file type. Choose an image file such as JPG, PNG, WebP, GIF, SVG, HEIC, or TIFF.");
  }

  const profile = getImageUploadProfile(kind);
  const warnings = [];

  if (file.size > imageHardLimitSize) {
    throw new Error(
      `File too large. Compress or use a smaller file. ${file.name || "Selected image"} is ${formatUploadFileSize(file.size)}; the limit is ${formatUploadFileSize(imageHardLimitSize)}.`,
    );
  }

  if (file.size > profile.warningSize) {
    warnings.push(
      `${file.name || "Selected image"} is ${formatUploadFileSize(file.size)}. Large ${profile.label}s may upload and sync more slowly.`,
    );
  }

  return {
    file,
    kind: profile.key,
    warnings,
  };
}

export function validatePdfUploadFile(file) {
  if (!file) {
    throw new Error("Choose a PDF file.");
  }

  if (!isPdfFile(file)) {
    throw new Error("Unsupported file type. Choose a PDF file to attach.");
  }

  const warnings = [];

  if (file.size > pdfWarningSize) {
    warnings.push(`${file.name || "Selected PDF"} is ${formatUploadFileSize(file.size)}. Large PDFs may upload and open more slowly.`);
  }

  return {
    file,
    warnings,
  };
}

export async function prepareImageFileForUpload(file, { kind = "featured" } = {}) {
  const validation = validateImageUploadFile(file, { kind });
  const profile = getImageUploadProfile(kind);
  const warnings = [...validation.warnings];
  let compression = {
    attempted: false,
    failed: false,
    message: "",
    originalSize: file.size || 0,
    outputSize: file.size || 0,
    wasCompressed: false,
  };

  try {
    const compressionResult = await compressImageFile(file, profile);
    compression = {
      ...compression,
      ...compressionResult,
    };
  } catch (error) {
    const errorMessage = formatStorageUploadError(error);
    warnings.push(`Image compression failed; using the original file. ${errorMessage}`);
    compression = {
      ...compression,
      attempted: true,
      failed: true,
      message: `Image compression failed; using the original file. ${errorMessage}`,
    };
  }

  return {
    file: compression.file || file,
    originalFile: file,
    warnings,
    compression,
  };
}

export async function uploadProposalAssetToCloud(file, { area, companySettings, companyUser, fileStem, proposalId, companyDeps = {} }) {
  if (!canUseCloudSync(companyUser)) {
    throw new Error("Sign in to upload images to cloud storage.");
  }

  const safeArea = getProposalAssetArea(area);
  validateImageUploadFile(file, { kind: safeArea === "plans" ? "plan" : "featured" });

  const activeUser = await getActiveSupabaseUser();
  const companyRecord = await ensureCloudCompany(activeUser, companySettings, companyDeps);
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
    cloudSynced: true,
    companyId: companyRecord.id,
    dataUrl: "",
    fileName: file.name || `${safeFileStem}.${extension}`,
    fileSize: file.size || 0,
    fileType: file.type || "image/jpeg",
    publicUrl,
    signedUrl: "",
    src: publicUrl,
    storagePath: uploadedPath,
    uploadedAt: new Date().toISOString(),
  };
}

function getProposalAssetArea(area) {
  if (area === "plans") {
    return "plans";
  }

  if (area === "option-photos") {
    return "option-photos";
  }

  return "featured";
}

export async function uploadSubmittedPacketPdfToCloud(file, { companySettings, companyUser, packetRecordId, proposalId, companyDeps = {} }) {
  if (!canUseCloudSync(companyUser)) {
    throw new Error("PDF file archive requires cloud sign-in.");
  }

  validatePdfUploadFile(file);

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

export async function uploadLegalAttachmentPdfToCloud(file, { attachmentId, companySettings, companyUser, proposalId, companyDeps = {} }) {
  if (!canUseCloudSync(companyUser)) {
    throw new Error("Legal paper attachment upload requires cloud sign-in.");
  }

  validatePdfUploadFile(file);

  const activeUser = await getActiveSupabaseUser();
  const companyRecord = await ensureCloudCompany(activeUser, companySettings, companyDeps);
  const timestamp = Date.now();
  const safeAttachmentId = sanitizeStoragePathSegment(attachmentId || "legal-paper");
  const proposalPathSegment = sanitizeStoragePathSegment(proposalId || "unsaved");
  const storagePath = `company/${companyRecord.id}/proposals/${proposalPathSegment}/legal-papers/${safeAttachmentId}-${timestamp}.pdf`;
  const uploadOptions = {
    cacheControl: "3600",
    contentType: file.type || "application/pdf",
    upsert: false,
  };
  const { data, error } = await supabase.storage.from(proposalAssetsBucket).upload(storagePath, file, uploadOptions);

  if (error) {
    console.error("Supabase Storage legal paper PDF upload failed:", {
      bucket: proposalAssetsBucket,
      error,
      path: storagePath,
    });
    throw new Error(formatStorageUploadError(error));
  }

  const uploadedPath = data?.path || storagePath;
  const publicUrl = getStoragePublicUrl(uploadedPath);

  return {
    fileName: file.name || `${safeAttachmentId}.pdf`,
    fileSize: file.size || 0,
    fileType: file.type || "application/pdf",
    publicUrl,
    storagePath: uploadedPath,
    uploadedAt: new Date().toISOString(),
    uploadedBy: activeUser.email || "",
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
  validateImageUploadFile(file);

  const dataUrl = await readFileAsDataUrl(file);

  return {
    cloudSynced: false,
    dataUrl,
    fileName: file.name || "local-image",
    fileSize: file.size || 0,
    fileType: file.type || "image/jpeg",
    publicUrl: "",
    signedUrl: "",
    src: dataUrl,
    storagePath: "",
    localOnly: true,
    uploadedAt: new Date().toISOString(),
  };
}

function getImageUploadProfile(kind) {
  const profileKey = kind === "plan" || kind === "plans" ? "plan" : "featured";
  return {
    key: profileKey,
    ...imageUploadProfiles[profileKey],
  };
}

function isSupportedImageFile(file) {
  if (String(file?.type || "").toLowerCase().startsWith("image/")) {
    return true;
  }

  const extension = getFileExtension(file);
  return supportedImageExtensions.has(extension);
}

async function compressImageFile(file, profile) {
  const originalSize = file.size || 0;

  if (!canCompressImageFile(file)) {
    return {
      attempted: false,
      file,
      message: "Compression skipped for this image type.",
      originalSize,
      outputSize: originalSize,
      wasCompressed: false,
    };
  }

  if (typeof Image === "undefined" || typeof document === "undefined" || typeof URL === "undefined") {
    return {
      attempted: false,
      file,
      message: "Compression skipped outside the browser.",
      originalSize,
      outputSize: originalSize,
      wasCompressed: false,
    };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageFromObjectUrl(objectUrl);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    if (!width || !height) {
      return {
        attempted: true,
        file,
        message: "Compression skipped because the image dimensions could not be read.",
        originalSize,
        outputSize: originalSize,
        wasCompressed: false,
      };
    }

    const scale = Math.min(1, profile.maxDimension / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const shouldCompress = scale < 1 || originalSize > profile.warningSize || originalSize > megabyte;

    if (!shouldCompress) {
      return {
        attempted: false,
        file,
        message: "Compression skipped because the image is already small.",
        originalSize,
        outputSize: originalSize,
        wasCompressed: false,
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to prepare image compression canvas.");
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    const blob = await canvasToBlob(canvas, "image/jpeg", profile.quality);

    if (!blob || blob.size >= originalSize) {
      return {
        attempted: true,
        file,
        message: "Compression kept the original because it was smaller.",
        originalSize,
        outputSize: originalSize,
        wasCompressed: false,
      };
    }

    const compressedFile = createFileFromBlob(blob, replaceFileExtension(file.name || "image", "jpg"), "image/jpeg");

    return {
      attempted: true,
      file: compressedFile,
      message: `Compressed from ${formatUploadFileSize(originalSize)} to ${formatUploadFileSize(compressedFile.size)}.`,
      originalSize,
      outputSize: compressedFile.size || blob.size || originalSize,
      wasCompressed: true,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canCompressImageFile(file) {
  return compressibleImageTypes.has(String(file?.type || "").toLowerCase());
}

function loadImageFromObjectUrl(objectUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load selected image for compression."));
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Unable to compress selected image."));
      }
    }, type, quality);
  });
}

function createFileFromBlob(blob, name, type) {
  if (typeof File !== "undefined") {
    return new File([blob], name, {
      lastModified: Date.now(),
      type,
    });
  }

  Object.defineProperty(blob, "name", {
    configurable: true,
    value: name,
  });
  Object.defineProperty(blob, "lastModified", {
    configurable: true,
    value: Date.now(),
  });

  return blob;
}

function replaceFileExtension(fileName, extension) {
  const safeName = String(fileName || "image").replace(/\.[^.]+$/, "");
  return `${safeName || "image"}.${extension}`;
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

function formatUploadFileSize(value) {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < megabyte) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / megabyte).toFixed(1)} MB`;
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
