export const getApiErrorMessage = (
  error: any,
  fallback: string = "An unexpected error occurred."
): string => {
  if (!error) return fallback;

  // If error already has a message, start with that
  let message = error.message || fallback;

  const data = error.errorData || error.data || error.response?.data;

  if (!data) return message;

  // Prefer explicit message field
  if (typeof data.message === "string" && data.message.trim()) {
    message = data.message;
  }

  // Append details if available
  if (typeof data.details === "string" && data.details.trim()) {
    message += `\n\n${data.details}`;
  }

  // ASP.NET validation errors: errors: { Field: [msg1, msg2] }
  if (data.errors && typeof data.errors === "object") {
    const fieldMessages: string[] = [];
    for (const [field, msgs] of Object.entries<any>(data.errors)) {
      if (Array.isArray(msgs)) {
        fieldMessages.push(`${field}: ${msgs.join(", ")}`);
      } else if (typeof msgs === "string") {
        fieldMessages.push(`${field}: ${msgs}`);
      }
    }
    if (fieldMessages.length) {
      message += `\n\n${fieldMessages.join("\n")}`;
    }
  }

  return message;
};

// Simple error message function that returns only concise messages
export const getSimpleErrorMessage = (
  error: any,
  fallback: string = "Operation failed"
): string => {
  if (!error) return fallback;

  // Check for specific known error patterns and return concise messages
  const message = error.message || error.error || "";

  if (message.includes("duplicate") || message.includes("already exists")) {
    return "Duplicate data detected";
  }

  if (message.includes("constraint") || message.includes("foreign key")) {
    return "Cannot delete - item is in use";
  }

  if (message.includes("validation") || message.includes("required")) {
    return "Invalid data provided";
  }

  if (message.includes("unauthorized") || message.includes("401")) {
    return "Access denied";
  }

  if (message.includes("not found") || message.includes("404")) {
    return "Item not found";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "Connection failed";
  }

  if (message.includes("defense sessions")) {
    return "Cannot delete - has active defense sessions";
  }

  // If it's an import message, return it as is (might contain counts)
  if (message.trim().startsWith("Import completed")) {
    return message;
  }

  // Return first sentence only for any other errors
  const firstSentence = message.split('.')[0] || message.substring(0, 100);
  return firstSentence.trim() || fallback;
};


