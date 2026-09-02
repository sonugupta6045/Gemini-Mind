export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  category?: string;
  summary?: string;
  brainstormIdeas?: string[];
  tags?: string[];
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
}

export type ReflectionMode = "reflection" | "brainstorm" | "summary" | "coaching";
