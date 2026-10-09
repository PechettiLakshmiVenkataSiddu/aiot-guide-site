import Dexie, { type Table } from 'dexie';

export interface ChatThread {
  id: string;
  projectId: string | null;
  title: string;
  updatedAt: number;
  summary?: string;
}

export interface StoredChatMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  results?: any[];
  isDeepAnswer?: boolean;
  feedback?: 'up' | 'down' | null;
  createdAt: number;
}

export interface UserFact {
  id: string;
  category: 'hardware' | 'experience' | 'goal' | 'preference';
  fact: string;
  approved: boolean;
  createdAt: number;
}

export interface AppSetting {
  key: string;
  value: any;
}

export interface QueryVectorCacheItem {
  query: string;
  vector: number[];
  createdAt: number;
}

export class AiotDatabase extends Dexie {
  threads!: Table<ChatThread, string>;
  messages!: Table<StoredChatMessage, string>;
  settings!: Table<AppSetting, string>;
  userFacts!: Table<UserFact, string>;
  queryCache!: Table<QueryVectorCacheItem, string>;

  constructor() {
    super('AiotGuideDB');
    this.version(1).stores({
      threads: 'id, projectId, updatedAt',
      messages: 'id, threadId, role, createdAt',
      settings: 'key',
      userFacts: 'id, category, approved',
      queryCache: 'query, createdAt'
    });
  }
}

export const db = new AiotDatabase();

// Settings Helper with Defaults
export interface UserPreferences {
  haptics: boolean;
  sound: boolean;
  volume: number;
  reducedMotion: boolean;
  answerStyle: 'concise' | 'detailed' | 'tutorial';
  answerMode: 'retrieval' | 'deep';
  modelChoice: string;
  theme: 'dark' | 'synthwave';
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  haptics: true,
  sound: false,
  volume: 0.5,
  reducedMotion: false,
  answerStyle: 'concise',
  answerMode: 'retrieval',
  modelChoice: 'SmolLM-135M-Instruct-q0f16-MLC',
  theme: 'dark'
};

export async function getPreference<T>(key: keyof UserPreferences, defaultValue: T): Promise<T> {
  try {
    const item = await db.settings.get(key);
    return item ? (item.value as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setPreference<T>(key: keyof UserPreferences, value: T): Promise<void> {
  try {
    await db.settings.put({ key, value });
  } catch (err) {
    console.warn(`Failed to save preference ${key}:`, err);
  }
}

// Conversation Thread Helpers
export async function getOrCreateThread(projectId: string | null = null): Promise<ChatThread> {
  try {
    const existing = await db.threads
      .where('projectId')
      .equals(projectId ?? '')
      .reverse()
      .sortBy('updatedAt');

    if (existing && existing.length > 0) {
      return existing[0];
    }
  } catch {
    // fallback
  }

  const newThread: ChatThread = {
    id: `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    projectId: projectId ?? '',
    title: projectId ? `Project ${projectId}` : 'General Discussion',
    updatedAt: Date.now()
  };

  try {
    await db.threads.put(newThread);
  } catch (err) {
    console.warn("Thread persistence error:", err);
  }
  return newThread;
}

export async function loadThreadMessages(threadId: string): Promise<StoredChatMessage[]> {
  try {
    return await db.messages.where('threadId').equals(threadId).sortBy('createdAt');
  } catch {
    return [];
  }
}

export async function saveChatMessage(msg: StoredChatMessage): Promise<void> {
  try {
    await db.messages.put(msg);
    await db.threads.update(msg.threadId, { updatedAt: Date.now() });
  } catch (err) {
    console.warn("Message save error:", err);
  }
}

export async function recordMessageFeedback(msgId: string, feedback: 'up' | 'down'): Promise<void> {
  try {
    await db.messages.update(msgId, { feedback });
  } catch (err) {
    console.warn("Feedback save error:", err);
  }
}
