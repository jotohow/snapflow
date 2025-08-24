export default class Message {
  content: string; // This is what the user sees
  role: 'user' | 'assistant';
  systemContent?: string; // This is what is sent to the model

  constructor(
    content: string,
    role: 'user' | 'assistant',
    systemContent?: string
  ) {
    this.content = content;
    this.role = role;
    this.systemContent = content;
  }
}
