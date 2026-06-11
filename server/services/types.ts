import type { DatabaseService } from "../db/index";
import type { PiMonoWrapper } from "./pi-mono-wrapper";

export interface DbDeps {
  db: DatabaseService;
}

export interface FullDeps extends DbDeps {
  piMono: PiMonoWrapper;
}
