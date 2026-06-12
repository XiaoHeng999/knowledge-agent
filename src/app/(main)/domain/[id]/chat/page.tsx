import { use } from "react";
import { ChatContent } from "./chat-content";

// Static export requires generateStaticParams for dynamic routes.
// This is an Electron app — domain IDs are runtime data from SQLite.
// Provide a placeholder so the build succeeds; actual navigation is
// handled client-side via Next.js router from the entry index.html.
export function generateStaticParams() {
  return [{ id: "__placeholder__" }];
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ChatContent domainId={decodeURIComponent(id)} />;
}
