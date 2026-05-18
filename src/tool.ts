import { jsonSchema, type ToolSet, tool } from "ai";

import { tool as execTool } from "./tool/exec";
import {
  createFile,
  findFiles,
  listFiles,
  readFile,
  updateFile,
} from "./tool/file";
import { tool as fetchPageTool } from "./tool/web";

type ListFilesInput = {
  path?: string;
  recursive?: boolean;
};

type FindFilesInput = {
  path?: string;
  pattern: string;
  glob?: string;
  ignoreCase?: boolean;
};

type ReadFileInput = {
  path: string;
  beginLine?: number;
  closeLine?: number;
};

type CreateFileInput = {
  path: string;
  content: string;
};

type UpdateFileInput = {
  path: string;
  oldString: string;
  newString: string;
};

type FetchPageInput = {
  url: string;
  headers?: Record<string, string>;
};

const execInputSchema = jsonSchema<{
  command: string;
  path?: string;
}>({
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Directory path relative to the current workspace.",
    },
    command: {
      type: "string",
      description: "Shell command to execute.",
    },
  },
  required: ["command"],
  additionalProperties: false,
});

const listFilesInputSchema = jsonSchema<ListFilesInput>({
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Directory path relative to the current workspace.",
    },
    recursive: {
      type: "boolean",
      description: "Whether to include nested files and directories.",
      default: true,
    },
  },
  additionalProperties: false,
});

const findFilesInputSchema = jsonSchema<FindFilesInput>({
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Directory path relative to the current workspace.",
      default: ".",
    },
    pattern: {
      type: "string",
      description: "Regex pattern to search for in file contents.",
    },
    glob: {
      type: "string",
      description: 'Glob pattern to filter files (e.g. "*.ts", "*.{ts,js}").',
    },
    ignoreCase: {
      type: "boolean",
      description: "Whether to perform case-insensitive matching.",
      default: false,
    },
  },
  required: ["pattern"],
  additionalProperties: false,
});

const readFileInputSchema = jsonSchema<ReadFileInput>({
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "File path relative to the current workspace.",
    },
    beginLine: {
      type: "integer",
      description: "1-based begin line number, inclusive.",
      minimum: 1,
      default: 1,
    },
    closeLine: {
      type: "integer",
      description: "1-based close line number, inclusive.",
      minimum: 1,
    },
  },
  required: ["path"],
  additionalProperties: false,
});

const createFileInputSchema = jsonSchema<CreateFileInput>({
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "File path relative to the current workspace.",
    },
    content: {
      type: "string",
      description: "Full file content to write.",
    },
  },
  required: ["path", "content"],
  additionalProperties: false,
});

const updateFileInputSchema = jsonSchema<UpdateFileInput>({
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "File path relative to the current workspace.",
    },
    oldString: {
      type: "string",
      description: "Old string to replace.",
    },
    newString: {
      type: "string",
      description: "New string to replace.",
    },
  },
  required: ["path", "oldString", "newString"],
  additionalProperties: false,
});

const fetchPageInputSchema = jsonSchema<FetchPageInput>({
  type: "object",
  properties: {
    url: {
      type: "string",
      description: "URL to fetch. Must start with http:// or https://.",
    },
    headers: {
      type: "object",
      description: "Additional HTTP headers to send with the request.",
      additionalProperties: { type: "string" },
    },
  },
  required: ["url"],
  additionalProperties: false,
});

type ToolOptions = {
  root?: string;
};

export function createExecTools({ root }: ToolOptions = {}): ToolSet {
  return {
    exec: tool({
      description: "Execute a shell command in the current workspace.",
      inputSchema: execInputSchema,
      execute: async (input) => execTool({ ...input, root }),
    }),
  };
}

export function createFileTools({ root }: ToolOptions = {}): ToolSet {
  return {
    listFiles: tool({
      description: "List files and directories.",
      inputSchema: listFilesInputSchema,
      execute: async (input) => listFiles({ ...input, root }),
    }),
    findFiles: tool({
      description: "Find files and directories.",
      inputSchema: findFilesInputSchema,
      execute: async (input) => findFiles({ ...input, root }),
    }),
    readFile: tool({
      description: "Read a file with optional begin and close lines.",
      inputSchema: readFileInputSchema,
      execute: async (input) => readFile({ ...input, root }),
    }),
    createFile: tool({
      description: "Create a file.",
      inputSchema: createFileInputSchema,
      execute: async (input) => createFile({ ...input, root }),
    }),
    updateFile: tool({
      description: "Update a file.",
      inputSchema: updateFileInputSchema,
      execute: async (input) => updateFile({ ...input, root }),
    }),
  };
}

export function createWebTools(): ToolSet {
  return {
    fetchPage: tool({
      description:
        "Fetch a web page and return its content as text. Supports HTML, JSON, and plain text.",
      inputSchema: fetchPageInputSchema,
      execute: async (input) => fetchPageTool(input),
    }),
  };
}

export const execTools: ToolSet = createExecTools();
export const fileTools: ToolSet = createFileTools();
export const webTools: ToolSet = createWebTools();
