import { useState } from "react";

export interface CopyButtonProps {
  getText: () => string;
  label: string;
  className?: string;
}

export function CopyButton({ getText, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={["copy-button", "nodrag", "nopan", className].filter(Boolean).join(" ")}
      aria-label={label}
      title={copied ? "Copied!" : label}
      onClick={async (event) => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(getText());
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "✓" : "⧉"}
    </button>
  );
}
