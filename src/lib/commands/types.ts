export interface CommandParam {
  name: string;
  description: string;
  required: boolean;
}

export interface CommandDefinition {
  name: string;
  label: string;
  description: string;
  params: CommandParam[];
  execute: (args: string, context: CommandContext) => Promise<CommandResult>;
}

export interface ParsedCommand {
  name: string;
  args: string;
}

export interface CommandContext {
  domainId: string;
  conversationId: string;
  modelId: string;
}

export type CommandResult =
  | { type: "prompt"; content: string }
  | { type: "error"; message: string };
