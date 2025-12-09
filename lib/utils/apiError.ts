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


