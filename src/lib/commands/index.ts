export type { CommandDefinition, CommandParam, CommandContext, CommandResult, ParsedCommand } from "./types";
export { parseCommand, isCommandInput, extractPartialCommand } from "./parser";
export { registerCommand, getCommand, getAllCommands, findMatching, executeCommand } from "./registry";
import "./builtins";
