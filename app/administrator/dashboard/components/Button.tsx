"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
variant?: "default" | "outline";
size?: "sm" | "md" | "lg";
className?: string;
}

const Button: React.FC<ButtonProps> = ({
variant = "default",
size = "md",
className = "",
...props
}) => {
const baseStyle = "rounded font-medium transition focus:outline-none";

const variantStyle =
variant === "outline"
? "border border-gray-400 text-gray-700 hover:bg-gray-100"
: "bg-blue-600 text-white hover:bg-blue-700";

const sizeStyle =
size === "sm"
? "px-2 py-1 text-sm"
: size === "lg"
? "px-6 py-3 text-lg"
: "px-4 py-2 text-md";

return (
<button
{...props}
className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`}
/>
);
};

export default Button;
