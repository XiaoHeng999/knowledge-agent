/**
 * File system abstraction layer — public API.
 */

export {
  type IFileSystemProvider,
  type FileStat,
  NodeFileSystemProvider,
  FsError,
  getFileSystemProvider,
  setFileSystemProvider,
} from "./provider";

export {
  getDataDir,
  getLogDir,
  getTempDir,
  getDomainsDir,
  getDomainDir,
  getDatabasePath,
  resolveDomainPath,
  DOMAIN_SUBPATHS,
  type DomainSubpath,
  resetPathCache,
} from "./paths";

export {
  ensureDomainDir,
  validateDomainDir,
  initDomainConfig,
  readDomainConfig,
  removeDomainDir,
  type DomainDirValidation,
} from "./domain-dirs";

export {
  parseMarkdownFile,
  parseMarkdownString,
  serializeMarkdown,
  writeMarkdownFile,
  updateFrontmatter,
  type ParsedMarkdown,
} from "./markdown-parser";
