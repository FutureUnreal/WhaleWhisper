export type ChatRole = "user" | "assistant" | "error" | "system" | "tool";

export type ChatContentPart = {
  type: "text";
  text: string;
};

export type ChatSlicesText = {
  type: "text";
  text: string;
};

export type ChatSlicesToolCall = {
  type: "tool-call";
  toolCall: {
    toolName: string;
    args: string;
  };
};

export type ChatSlicesToolCallResult = {
  type: "tool-call-result";
  id: string;
  result?: string | ChatContentPart[];
};

export type ChatSlices =
  | ChatSlicesText
  | ChatSlicesToolCall
  | ChatSlicesToolCallResult;

export type BaseChatMessage = {
  id: string;
  role: ChatRole;
  content: string | ChatContentPart[];
  createdAt: number;
};

export type ChatAssistantMessage = BaseChatMessage & {
  role: "assistant";
  slices: ChatSlices[];
  tool_results: {
    id: string;
    result?: string | ChatContentPart[];
  }[];
};

export type ChatUserMessage = BaseChatMessage & { role: "user" };
export type ChatSystemMessage = BaseChatMessage & { role: "system" };
export type ChatToolMessage = BaseChatMessage & { role: "tool" };

export type ChatMessage =
  | ChatAssistantMessage
  | ChatUserMessage
  | ChatSystemMessage
  | ChatToolMessage;

export type ErrorMessage = {
  role: "error";
  content: string;
};

export type ChatHistoryItem = (ChatMessage | ErrorMessage) & {
  context?: {
    source?: string;
    createdAt?: number;
  };
  createdAt?: number;
};

export type ChatSession = {
  id: string;
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatHistoryItem[];
  agentConversationIds?: Record<string, string>;
};
