import type { ParsedCommand } from "./types";

const COMMAND_PREFIX = "/";

export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trimStart();
  if (!trimmed.startsWith(COMMAND_PREFIX)) return null;

  const body = trimmed.slice(COMMAND_PREFIX.length);
  if (body.length === 0) return null;

  const spaceIndex = body.indexOf(" ");
  if (spaceIndex === -1) {
    const name = body.toLowerCase();
    if (!isValidName(name)) return null;
    return { name, args: "" };
  }

  const name = body.slice(0, spaceIndex).toLowerCase();
  if (!isValidName(name)) return null;
  const args = body.slice(spaceIndex + 1).trim();
  return { name, args };
}

function isValidName(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(name) && name.length > 0 && name.length <= 32;
}

export function isCommandInput(input: string): boolean {
  const trimmed = input.trimStart();
  return trimmed.startsWith(COMMAND_PREFIX);
}

export function extractPartialCommand(input: string): string {
  const trimmed = input.trimStart();
  if (!trimmed.startsWith(COMMAND_PREFIX)) return "";

  const body = trimmed.slice(COMMAND_PREFIX.length);
  const spaceIndex = body.indexOf(" ");
  return spaceIndex === -1 ? body.toLowerCase() : body.slice(0, spaceIndex).toLowerCase();
}
