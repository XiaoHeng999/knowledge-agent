import type { ReactNode } from "react";

// Static export requires generateStaticParams for dynamic routes.
// This app is Electron-based — domain IDs are runtime data from SQLite,
// so there are no static paths to pre-render. Return an empty list and
// rely on the client-side router (or custom protocol) to resolve at runtime.
export function generateStaticParams() {
  return [];
}

export default function DomainLayout({ children }: { children: ReactNode }) {
  return children;
}
