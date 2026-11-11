import { createError } from "h3";

export function archiveHttpError(error: unknown) {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    return error;
  }
  const message = error instanceof Error ? error.message : "ARCHIVE_ERROR";
  return createError({
    statusCode: message === "ARCHIVE_ENTRY_NOT_FOUND" ? 404 : 400,
    statusMessage: message,
  });
}
