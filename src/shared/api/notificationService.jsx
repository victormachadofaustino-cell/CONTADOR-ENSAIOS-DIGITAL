import toast from "react-hot-toast";
import { ShieldCheck, X, AlertTriangle, Info } from "lucide-react";

// Base style for all notifications to ensure consistency and match the app's aesthetic
const baseStyle = {
  borderRadius: "1.5rem",
  padding: "12px 20px",
  color: "#fff",
  boxShadow:
    "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  fontSize: "11px",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

export const notificationService = {
  /**
   * Displays a success notification.
   * Use for confirming a completed action.
   * @param {string} message The message to display.
   */
  success: (message) => {
    toast.success(message, {
      duration: 3000,
      style: {
        ...baseStyle,
        background: "#10B981", // emerald-500
      },
      iconTheme: {
        primary: "#fff",
        secondary: "#10B981",
      },
    });
  },

  /**
   * Displays an error notification.
   * Use for critical failures that stopped an action.
   * @param {string} message The message to display.
   */
  error: (message) => {
    toast.error(message, {
      duration: 5000,
      id: `error-${message.slice(0, 15)}`, // Prevents stacking identical errors
      style: {
        ...baseStyle,
        background: "#EF4444", // red-500
      },
      iconTheme: {
        primary: "#fff",
        secondary: "#EF4444",
      },
    });
  },

  /**
   * Displays a warning notification.
   * Use for non-critical issues or limits.
   * @param {string} message The message to display.
   */
  warn: (message) => {
    toast(message, {
      duration: 5000,
      id: `warn-${message.slice(0, 15)}`, // Prevents stacking identical warnings
      icon: <AlertTriangle size={20} color="#fff" />,
      style: {
        ...baseStyle,
        background: "#F59E0B", // amber-500
      },
    });
  },

  /**
   * Displays an informational notification.
   * Use for providing context or guidance.
   * @param {string} message The message to display.
   */
  info: (message) => {
    toast(message, {
      duration: 4000,
      icon: <Info size={20} color="#fff" />,
      style: {
        ...baseStyle,
        background: "#3B82F6", // blue-500
      },
    });
  },

  /**
   * Displays a loading notification.
   * @param {string} message The message to display.
   * @returns {string} The ID of the toast.
   */
  loading: (message) => {
    return toast.loading(message, {
      style: {
        ...baseStyle,
        background: "#64748B", // slate-500
      },
    });
  },
};
