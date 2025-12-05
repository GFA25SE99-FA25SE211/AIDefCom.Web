import Swal from "sweetalert2";

// Custom SweetAlert2 configurations for consistent styling
export const swalConfig = {
  // Success notification
  success: (title: string, text?: string) => {
    return Swal.fire({
      title,
      text,
      icon: "success",
      confirmButtonText: "OK",
      customClass: {
        confirmButton:
          "bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500",
        popup: "rounded-lg shadow-xl",
        title: "text-gray-800 font-semibold",
        htmlContainer: "text-gray-600",
      },
      buttonsStyling: false,
      showCloseButton: true,
    });
  },

  // Error notification
  error: (title: string, text?: string) => {
    return Swal.fire({
      title,
      text,
      icon: "error",
      confirmButtonText: "OK",
      customClass: {
        confirmButton:
          "bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500",
        popup: "rounded-lg shadow-xl",
        title: "text-gray-800 font-semibold",
        htmlContainer: "text-gray-600",
      },
      buttonsStyling: false,
      showCloseButton: true,
    });
  },

  // Warning notification
  warning: (title: string, text?: string) => {
    return Swal.fire({
      title,
      text,
      icon: "warning",
      confirmButtonText: "OK",
      customClass: {
        confirmButton:
          "bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500",
        popup: "rounded-lg shadow-xl",
        title: "text-gray-800 font-semibold",
        htmlContainer: "text-gray-600",
      },
      buttonsStyling: false,
      showCloseButton: true,
    });
  },

  // Info notification
  info: (title: string, text?: string) => {
    return Swal.fire({
      title,
      text,
      icon: "info",
      confirmButtonText: "OK",
      customClass: {
        confirmButton:
          "bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500",
        popup: "rounded-lg shadow-xl",
        title: "text-gray-800 font-semibold",
        htmlContainer: "text-gray-600",
      },
      buttonsStyling: false,
      showCloseButton: true,
    });
  },

  // Confirmation dialog
  confirm: (
    title: string,
    text?: string,
    confirmText: string = "Yes, delete it!"
  ) => {
    return Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: "Cancel",
      customClass: {
        confirmButton:
          "bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 mr-2",
        cancelButton:
          "bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500",
        popup: "rounded-lg shadow-xl",
        title: "text-gray-800 font-semibold",
        htmlContainer: "text-gray-600",
      },
      buttonsStyling: false,
      reverseButtons: true,
    });
  },

  // Loading notification
  loading: (title: string = "Loading...", text?: string) => {
    return Swal.fire({
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      customClass: {
        popup: "rounded-lg shadow-xl",
        title: "text-gray-800 font-semibold",
        htmlContainer: "text-gray-600",
      },
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  // Toast notification (top-right corner)
  toast: {
    success: (title: string) => {
      return Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
          popup: "colored-toast",
        },
      });
    },

    error: (title: string) => {
      return Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title,
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        customClass: {
          popup: "colored-toast",
        },
      });
    },

    info: (title: string) => {
      return Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
          popup: "colored-toast",
        },
      });
    },
  },

  // Close any open Swal dialog
  closeSwal: () => {
    Swal.close();
  },
};

// Standalone close function for direct import
export const closeSwal = () => {
  Swal.close();
};
