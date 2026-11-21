#!/usr/bin/env node
import { execFile } from 'node:child_process'
import path from 'node:path'
import readline from 'node:readline'

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = { name: 'carol-ling', version: '0.0.1' }
const DEFAULT_MANIFEST = 'project-info.md'
const MAX_BUFFER_BYTES = 16 * 1024 * 1024

const TOOLS = [
  {
    name: 'goToDefinition',
    description: 'Find definitions of the symbol at a 1-based line and column using ling.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the source file.' },
        line: { type: 'integer', description: '1-based line number.' },
        character: { type: 'integer', description: '1-based column number.' },
        manifest: { type: 'string', description: 'Optional manifest path (default: project-info.md).' }
      },
      required: ['filePath', 'line', 'character']
    }
  },
  {
    name: 'findReferences',
    description: 'Find all references to the symbol at a 1-based line and column using ling.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the source file.' },
        line: { type: 'integer', description: '1-based line number.' },
        character: { type: 'integer', description: '1-based column number.' },
        manifest: { type: 'string', description: 'Optional manifest path (default: project-info.md).' }
      },
      required: ['filePath', 'line', 'character']
    }
  },
  {
    name: 'hover',
    description: 'Get type and declaration hover info at a 1-based line and column using ling.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the source file.' },
        line: { type: 'integer', description: '1-based line number.' },
        character: { type: 'integer', description: '1-based column number.' },
        manifest: { type: 'string', description: 'Optional manifest path (default: project-info.md).' }
      },
      required: ['filePath', 'line', 'character']
    }
  },
  {
    name: 'documentSymbol',
    description: 'List all symbols in a file using ling.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the source file.' },
        manifest: { type: 'string', description: 'Optional manifest path (default: project-info.md).' }
      },
      required: ['filePath']
    }
  },
  {
    name: 'workspaceSymbol',
    description: 'Search symbols across the project workspace by name using ling.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Symbol name query.' },
        projectDir: { type: 'string', description: 'Absolute path to the project directory holding project-info.md.' },
        manifest: { type: 'string', description: 'Optional manifest path (default: project-info.md).' }
      },
      required: ['query', 'projectDir']
    }
  },
  {
    name: 'goToImplementation',
    description: 'Find derived classes or overriding implementations at a 1-based line and column using ling.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the source file.' },
        line: { type: 'integer', description: '1-based line number.' },
        character: { type: 'integer', description: '1-based column number.' },
        manifest: { type: 'string', description: 'Optional manifest path (default: project-info.md).' }
      },
      required: ['filePath', 'line', 'character']
    }
  },
  {
    name: 'prepareCallHierarchy',
    description: 'Prepare call hierarchy items at a 1-based line and column using ling.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the source file.' },
        line: { type: 'integer', description: '1-based line number.' },
        character: { type: 'integer', description: '1-based column number.' },
        manifest: { type: 'string', description: 'Optional manifest path (default: project-info.md).' }
      },
      required: ['filePath', 'line', 'character']
    }
  },
  {
    name: 'incomingCalls',
    description: 'Find all callers of the function at a 1-based line and column using ling.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the source file.' },
        line: { type: 'integer', description: '1-based line number.' },
        character: { type: 'integer', description: '1-based column number.' },
        manifest: { type: 'string', description: 'Optional manifest path (default: project-info.md).' }
      },
      required: ['filePath', 'line', 'character']
    }
  },
  {
    name: 'outgoingCalls',
    description: 'Find all calls made by the function at a 1-based line and column using ling.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the source file.' },
        line: { type: 'integer', description: '1-based line number.' },
        character: { type: 'integer', description: '1-based column number.' },
        manifest: { type: 'string', description: 'Optional manifest path (default: project-info.md).' }
      },
      required: ['filePath', 'line', 'character']
    }
  },
  {
    name: 'switchSourceHeader',
    description: 'Find the counterpart header or source file using ling.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the source or header file.' },
        manifest: { type: 'string', description: 'Optional manifest path (default: project-info.md).' }
      },
      required: ['filePath']
    }
  }
]

const POSITION_TOOLS = new Set([
  'goToDefinition',
  'findReferences',
  'hover',
  'goToImplementation',
  'prepareCallHierarchy',
  'incomingCalls',
  'outgoingCalls'
])

const FILE_TOOLS = new Set(['documentSymbol', 'switchSourceHeader'])

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n')
}

function buildLingInvocation(name, args) {
  const manifest = args.manifest || DEFAULT_MANIFEST
  if (POSITION_TOOLS.has(name)) {
    return {
      cwd: path.dirname(args.filePath),
      argv: [name, manifest, args.filePath, String(args.line), String(args.character)]
    }
  }
  if (FILE_TOOLS.has(name)) {
    return {
      cwd: path.dirname(args.filePath),
      argv: [name, manifest, args.filePath]
    }
  }
  if (name === 'workspaceSymbol') {
    return {
      cwd: args.projectDir,
      argv: [name, manifest, args.query]
    }
  }
  return null
}

function runLing(argv, cwd) {
  return new Promise((resolve) => {
    execFile('ling', argv, { cwd, maxBuffer: MAX_BUFFER_BYTES }, (error, stdout, stderr) => {
      if (error && !stdout.trim()) {
        resolve({ isError: true, text: (stderr || error.message).trim() })
        return
      }
      resolve({ isError: Boolean(error), text: (stdout || stderr).trim() })
    })
  })
}

async function handleRequest(request) {
  const { id, method, params = {} } = request

  if (method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO
      }
    })
    return
  }

  if (method === 'notifications/initialized') return

  if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: TOOLS } })
    return
  }

  if (method === 'tools/call') {
    const invocation = buildLingInvocation(params.name, params.arguments ?? {})
    if (!invocation) {
      send({
        jsonrpc: '2.0',
        id,
        result: { isError: true, content: [{ type: 'text', text: 'Unknown tool: ' + params.name }] }
      })
      return
    }
    const outcome = await runLing(invocation.argv, invocation.cwd)
    send({
      jsonrpc: '2.0',
      id,
      result: {
        isError: outcome.isError,
        content: [{ type: 'text', text: outcome.text }]
      }
    })
    return
  }

  if (id !== undefined) {
    send({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: 'Method not found: ' + method }
    })
  }
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
input.on('line', (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  try {
    handleRequest(JSON.parse(trimmed))
  } catch (error) {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: error.message } })
  }
})
