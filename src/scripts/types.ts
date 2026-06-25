// Shared types for the in-browser pseudo-terminal.

export type Post = {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  category: string;
  description: string;
};

export type Ctx = {
  posts: Post[];
  // Append a chunk of HTML to the screen. Caller is responsible for escaping.
  out: (html: string) => void;
  // Wipe the screen.
  clear: () => void;
  // Read or set the active terminal theme.
  getTheme: () => string;
  setTheme: (name: string) => boolean;
  // Read the in-memory history (newest last).
  history: () => string[];
  // Close the overlay.
  close: () => void;
};

export type Cmd = {
  name: string;
  // One-line description shown in `help`.
  brief: string;
  // Full man-page paragraph, optional.
  manual?: string;
  run: (args: string[], ctx: Ctx) => void | Promise<void>;
};

// Tiny HTML escape used by every command.
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]!),
  );
}
