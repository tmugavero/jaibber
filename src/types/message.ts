export interface Message {
  id: string;
  conversationId: string;
  sender: "me" | "them";
  text: string;
  timestamp: string;
  status: "sending" | "sent" | "streaming" | "done" | "error";
}

export interface AblyMessage {
  from: string;
  to: string;
  text: string;
  messageId: string;
  type: "message" | "response" | "typing" | "done" | "error";
  responseId?: string;  // sent in "typing" so hub can pre-create bubble with correct ID
}
