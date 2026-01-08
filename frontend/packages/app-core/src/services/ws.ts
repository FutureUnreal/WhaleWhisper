import type { Ref } from "vue";

import { ref } from "vue";

export type ChatStatus = "disconnected" | "connecting" | "connected" | "error";

export type ClientEvent = {
  type: string;
  data?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  sessionId?: string;
  source?: string;
  id?: string;
  ts?: number;
};

export type ServerEvent = {
  type: string;
  data?: Record<string, any>;
  payload?: Record<string, any>;
  sessionId?: string;
  source?: string;
  id?: string;
  ts?: number;
};

export type ChatSocketOptions = {
  token?: string;
  moduleName?: string;
  moduleIndex?: number;
  possibleEvents?: string[];
};

export type ChatSocket = {
  status: Ref<ChatStatus>;
  connect: () => void;
  disconnect: () => void;
  send: (event: ClientEvent) => void;
  onEvent: (handler: (event: ServerEvent) => void) => () => void;
};

export function createChatSocket(url: string, options: ChatSocketOptions = {}): ChatSocket {
  const status = ref<ChatStatus>("disconnected");
  let socket: WebSocket | null = null;
  const listeners = new Set<(event: ServerEvent) => void>();
  const pendingEvents: ClientEvent[] = [];
  let authenticated = false;
  let pendingAnnounce = false;

  function notify(event: ServerEvent) {
    listeners.forEach((handler) => handler(event));
  }

  function connect() {
    if (socket) {
      return;
    }
    status.value = "connecting";
    socket = new WebSocket(url);
    authenticated = !options.token;
    pendingAnnounce = false;

    socket.addEventListener("open", () => {
      status.value = "connected";
      if (options.token) {
        pendingAnnounce = true;
        sendInternal({
          type: "module.authenticate",
          data: { token: options.token },
        });
        return;
      }
      sendAnnounce();
    });

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }
      try {
        const payload = JSON.parse(event.data) as ServerEvent;
        const data = payload.data ?? payload.payload ?? {};
        if (payload.type === "module.authenticated" && data.authenticated && !authenticated) {
          authenticated = true;
          if (pendingAnnounce) {
            sendAnnounce();
          }
          flushPendingEvents();
        }
        notify(payload);
      } catch {
        notify({ type: "error", payload: { message: "Invalid server message." } });
      }
    });

    socket.addEventListener("close", () => {
      status.value = "disconnected";
      socket = null;
      authenticated = false;
      pendingAnnounce = false;
    });

    socket.addEventListener("error", () => {
      status.value = "error";
    });
  }

  function disconnect() {
    if (!socket) {
      return;
    }
    socket.close();
    socket = null;
    status.value = "disconnected";
    authenticated = false;
    pendingAnnounce = false;
  }

  function send(event: ClientEvent) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    if (!authenticated) {
      pendingEvents.push(event);
      return;
    }
    sendInternal(event);
  }

  function sendInternal(event: ClientEvent) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const data = event.data ?? event.payload ?? {};
    const payload = {
      type: event.type,
      data,
      payload: data,
      sessionId: event.sessionId,
      source: event.source,
      id: event.id,
      ts: event.ts,
    };
    socket.send(JSON.stringify(payload));
  }

  function sendAnnounce() {
    pendingAnnounce = false;
    sendInternal({
      type: "module.announce",
      data: {
        name: options.moduleName || "whalewhisper:stage-web",
        index: options.moduleIndex,
        possibleEvents: options.possibleEvents ?? [],
      },
    });
  }

  function flushPendingEvents() {
    if (!pendingEvents.length) {
      return;
    }
    const queued = pendingEvents.splice(0, pendingEvents.length);
    queued.forEach((event) => send(event));
  }

  function onEvent(handler: (event: ServerEvent) => void) {
    listeners.add(handler);
    return () => listeners.delete(handler);
  }

  return {
    status,
    connect,
    disconnect,
    send,
    onEvent,
  };
}
