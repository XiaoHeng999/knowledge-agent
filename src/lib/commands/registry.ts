import type { CommandDefinition, CommandContext, CommandResult, ParsedCommand } from "./types";

const commands = new Map<string, CommandDefinition>();

export function registerCommand(def: CommandDefinition): void {
  commands.set(def.name, def);
}

export function getCommand(name: string): CommandDefinition | undefined {
  return commands.get(name);
}

export function getAllCommands(): CommandDefinition[] {
  return Array.from(commands.values());
}

export function findMatching(partial: string): CommandDefinition[] {
  if (!partial) return getAllCommands();
  const lower = partial.toLowerCase();
  return getAllCommands().filter(
    (cmd) => cmd.name.startsWith(lower) || cmd.label.toLowerCase().includes(lower),
  );
}

export async function executeCommand(
  parsed: ParsedCommand,
  context: CommandContext,
): Promise<CommandResult> {
  const cmd = commands.get(parsed.name);
  if (!cmd) {
    return { type: "error", message: `Unknown command: /${parsed.name}. Type / to see available commands.` };
  }

  const missingRequired = cmd.params.filter((p) => p.required && !parsed.args.trim());
  if (missingRequired.length > 0) {
    const names = missingRequired.map((param) => `<${param.name}>`).join(", ");
    return { type: "error", message: `Missing required argument: ${names}` };
  }

  return cmd.execute(parsed.args, context);
}
