import { spawn } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const TOOL_NAME = 'lsp'
const REQUEST_TIMEOUT_MS = 60_000
const HEADER_SEPARATOR = '\r\n\r\n'
const CONTENT_LENGTH_PATTERN = /Content-Length: (\d+)/i
const OPERATIONS = ['goToDefinition', 'findReferences', 'hover', 'documentSymbol', 'workspaceSymbol', 'goToImplementation', 'prepareCallHierarchy', 'incomingCalls', 'outgoingCalls']
const SYMBOL_KINDS = ['', 'File', 'Module', 'Namespace', 'Package', 'Class', 'Method', 'Property', 'Field', 'Constructor', 'Enum', 'Interface', 'Function', 'Variable', 'Constant', 'String', 'Number', 'Boolean', 'Array', 'Object', 'Key', 'Null', 'EnumMember', 'Struct', 'Event', 'Operator', 'TypeParameter']
const CLIENT_CAPABILITIES = {
  general: { positionEncodings: ['utf-16'] },
  textDocument: {
    synchronization: { didSave: false },
    definition: { linkSupport: true },
    implementation: { linkSupport: true },
    references: {},
    hover: { contentFormat: ['markdown', 'plaintext'] },
    documentSymbol: { hierarchicalDocumentSymbolSupport: true },
    callHierarchy: {},
  },
  workspace: { symbol: {}, workspaceFolders: true, configuration: true },
}

const DESCRIPTION = [
  'Interact with Language Server Protocol (LSP) servers to get code intelligence features.',
  '',
  'Supported operations:',
  '- goToDefinition: Find where a symbol is defined',
  '- findReferences: Find all references to a symbol',
  '- hover: Get hover information (documentation, type info) for a symbol',
  '- documentSymbol: Get all symbols (functions, classes, variables) in a document',
  '- workspaceSymbol: Search for symbols across the entire workspace',
  '- goToImplementation: Find implementations of an interface or abstract method',
  '- prepareCallHierarchy: Get call hierarchy item at a position (functions/methods)',
  '- incomingCalls: Find all functions/methods that call the function at a position',
  '- outgoingCalls: Find all functions/methods called by the function at a position',
  '',
  'All operations require filePath, line (1-based) and character (1-based). workspaceSymbol also takes query.',
].join('\n')

const INPUT_SCHEMA = {
  type: 'object',
  properties: {
    operation: { type: 'string', enum: OPERATIONS, description: 'The LSP operation to perform' },
    filePath: { type: 'string', description: 'The absolute or relative path to the file' },
    line: { type: 'integer', minimum: 1, description: 'The line number (1-based, as shown in editors)' },
    character: { type: 'integer', minimum: 1, description: 'The character offset (1-based, as shown in editors)' },
    query: { type: 'string', description: 'The symbol name or partial name to search for (workspaceSymbol only). Most language servers return no results for an empty query, so always provide it when using workspaceSymbol.' },
  },
  required: ['operation', 'filePath', 'line', 'character'],
  additionalProperties: false,
}

function readServers(root) {
  const manifest = JSON.parse(readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'))
  return Object.entries(manifest.lspServers ?? {}).map(([name, server]) => ({ name, ...server }))
}

function makeClient(server, rootDirectory) {
  const pending = new Map()
  const documents = new Map()
  let child
  let ready
  let buffer = Buffer.alloc(0)
  let nextID = 1

  function send(message) {
    const body = JSON.stringify({ jsonrpc: '2.0', ...message })
    child.stdin.write('Content-Length: ' + Buffer.byteLength(body) + HEADER_SEPARATOR + body)
  }

  function request(method, params) {
    const id = nextID++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(server.name + ' did not answer ' + method + ' within ' + REQUEST_TIMEOUT_MS + ' ms'))
      }, REQUEST_TIMEOUT_MS)
      pending.set(id, { resolve, reject, timer })
      send({ id, method, params })
    })
  }

  function answerServerRequest(message) {
    const result = message.method === 'workspace/configuration' ? message.params.items.map(() => null) : null
    send({ id: message.id, result })
  }

  function settle(message) {
    const entry = pending.get(message.id)
    if (entry === undefined) return
    pending.delete(message.id)
    clearTimeout(entry.timer)
    if (message.error === undefined) entry.resolve(message.result)
    else entry.reject(new Error(server.name + ': ' + message.error.message))
  }

  function receive(chunk) {
    buffer = Buffer.concat([buffer, chunk])
    for (let end = buffer.indexOf(HEADER_SEPARATOR); end !== -1; end = buffer.indexOf(HEADER_SEPARATOR)) {
      const length = Number(buffer.subarray(0, end).toString('ascii').match(CONTENT_LENGTH_PATTERN)?.[1])
      const start = end + HEADER_SEPARATOR.length
      if (buffer.length < start + length) return
      const message = JSON.parse(buffer.subarray(start, start + length).toString('utf8'))
      buffer = buffer.subarray(start + length)
      if (message.method !== undefined && message.id !== undefined) answerServerRequest(message)
      else if (message.method === undefined) settle(message)
    }
  }

  function reset(reason) {
    pending.forEach((entry) => {
      clearTimeout(entry.timer)
      entry.reject(new Error(server.name + ' exited: ' + reason))
    })
    pending.clear()
    documents.clear()
    child = undefined
    ready = undefined
  }

  async function start() {
    const rootUri = pathToFileURL(rootDirectory).href
    child = spawn(server.command, server.args ?? [], { cwd: rootDirectory, stdio: ['pipe', 'pipe', 'ignore'] })
    child.stdout.on('data', receive)
    child.on('error', (error) => reset(error.message))
    child.on('exit', (code) => reset('code ' + code))
    await request('initialize', {
      processId: process.pid,
      rootUri,
      workspaceFolders: [{ uri: rootUri, name: path.basename(rootDirectory) }],
      capabilities: CLIENT_CAPABILITIES,
    })
    send({ method: 'initialized', params: {} })
  }

  async function open(filePath, languageId) {
    ready ??= start()
    await ready
    const uri = pathToFileURL(filePath).href
    const mtimeMs = statSync(filePath).mtimeMs
    const known = documents.get(uri)
    if (known?.mtimeMs === mtimeMs) return uri
    const text = readFileSync(filePath, 'utf8')
    const version = (known?.version ?? 0) + 1
    if (known === undefined) send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId, version, text } } })
    else send({ method: 'textDocument/didChange', params: { textDocument: { uri, version }, contentChanges: [{ text }] } })
    documents.set(uri, { version, mtimeMs })
    return uri
  }

  function stop() {
    child?.kill()
  }

  return { open, request, stop }
}

function getRelativePath(rootDirectory, uri) {
  return path.relative(rootDirectory, fileURLToPath(uri)) || '.'
}

function formatLocation(rootDirectory, uri, range) {
  return getRelativePath(rootDirectory, uri) + ':' + (range.start.line + 1) + ':' + (range.start.character + 1)
}

function formatLocations(rootDirectory, result) {
  const locations = (Array.isArray(result) ? result : result === null || result === undefined ? [] : [result]).map((location) =>
    location.targetUri === undefined ? { uri: location.uri, range: location.range } : { uri: location.targetUri, range: location.targetSelectionRange },
  )
  const fileCount = new Set(locations.map((location) => location.uri)).size
  return {
    resultCount: locations.length,
    fileCount,
    text: ['Found ' + locations.length + ' result(s) in ' + fileCount + ' file(s)', ...locations.map((location) => formatLocation(rootDirectory, location.uri, location.range))].join('\n'),
  }
}

function formatHover(result) {
  const contents = result?.contents
  const parts = Array.isArray(contents) ? contents : contents === undefined ? [] : [contents]
  const text = parts.map((part) => (typeof part === 'string' ? part : part.value)).join('\n\n')
  return { resultCount: parts.length, fileCount: parts.length === 0 ? 0 : 1, text: text === '' ? 'No hover information' : text }
}

function formatSymbols(rootDirectory, uri, result) {
  const lines = []
  const visit = (symbol, depth) => {
    const range = symbol.selectionRange ?? symbol.location?.range ?? symbol.range
    const symbolUri = symbol.location?.uri ?? uri
    lines.push('  '.repeat(depth) + symbol.name + ' (' + SYMBOL_KINDS[symbol.kind] + ') ' + formatLocation(rootDirectory, symbolUri, range))
    ;(symbol.children ?? []).forEach((child) => visit(child, depth + 1))
  }
  ;(result ?? []).forEach((symbol) => visit(symbol, 0))
  const fileCount = new Set((result ?? []).map((symbol) => symbol.location?.uri ?? uri)).size
  return { resultCount: lines.length, fileCount, text: ['Found ' + lines.length + ' symbol(s)', ...lines].join('\n') }
}

function formatCalls(rootDirectory, calls, key) {
  const lines = calls.map((call) => call[key].name + ' (' + SYMBOL_KINDS[call[key].kind] + ') ' + formatLocation(rootDirectory, call[key].uri, call[key].selectionRange))
  const fileCount = new Set(calls.map((call) => call[key].uri)).size
  return { resultCount: lines.length, fileCount, text: ['Found ' + lines.length + ' call(s) in ' + fileCount + ' file(s)', ...lines].join('\n') }
}

async function runOperation(client, rootDirectory, uri, input) {
  const textDocument = { uri }
  const position = { line: input.line - 1, character: input.character - 1 }
  switch (input.operation) {
    case 'goToDefinition':
      return formatLocations(rootDirectory, await client.request('textDocument/definition', { textDocument, position }))
    case 'goToImplementation':
      return formatLocations(rootDirectory, await client.request('textDocument/implementation', { textDocument, position }))
    case 'findReferences':
      return formatLocations(rootDirectory, await client.request('textDocument/references', { textDocument, position, context: { includeDeclaration: true } }))
    case 'hover':
      return formatHover(await client.request('textDocument/hover', { textDocument, position }))
    case 'documentSymbol':
      return formatSymbols(rootDirectory, uri, await client.request('textDocument/documentSymbol', { textDocument }))
    case 'workspaceSymbol':
      return formatSymbols(rootDirectory, uri, await client.request('workspace/symbol', { query: input.query ?? '' }))
    case 'prepareCallHierarchy':
      return formatSymbols(rootDirectory, uri, await client.request('textDocument/prepareCallHierarchy', { textDocument, position }))
    case 'incomingCalls':
    case 'outgoingCalls': {
      const items = (await client.request('textDocument/prepareCallHierarchy', { textDocument, position })) ?? []
      const method = input.operation === 'incomingCalls' ? 'callHierarchy/incomingCalls' : 'callHierarchy/outgoingCalls'
      const calls = (await Promise.all(items.map((item) => client.request(method, { item })))).flat().filter(Boolean)
      return formatCalls(rootDirectory, calls, input.operation === 'incomingCalls' ? 'from' : 'to')
    }
  }
}

export async function registerLspTool(ctx, root) {
  const servers = readServers(root)
  const rootDirectory = ctx.location.directory
  const clients = new Map()

  function getClient(filePath) {
    const server = servers.find((candidate) => candidate.extensionToLanguage?.[path.extname(filePath)] !== undefined)
    if (server === undefined) return undefined
    if (!clients.has(server.name)) clients.set(server.name, makeClient(server, rootDirectory))
    return { client: clients.get(server.name), languageId: server.extensionToLanguage[path.extname(filePath)] }
  }

  await ctx.tool.transform((editor) => {
    editor.add({
      name: TOOL_NAME,
      description: DESCRIPTION,
      input: INPUT_SCHEMA,
      options: { permission: TOOL_NAME, codemode: false },
      execute: async (input, context) => {
        const filePath = path.resolve(rootDirectory, input.filePath)
        await ctx.permission.assert({
          sessionID: context.sessionID,
          agent: context.agent,
          source: { type: 'tool', messageID: context.messageID, id: context.id },
          action: TOOL_NAME,
          resources: [filePath],
        })
        const target = getClient(filePath)
        if (target === undefined) return { content: 'No LSP server available for file type: ' + path.extname(filePath) }
        const uri = await target.client.open(filePath, target.languageId)
        const result = await runOperation(target.client, rootDirectory, uri, input)
        return { content: result.text, metadata: { operation: input.operation, filePath: input.filePath, resultCount: result.resultCount, fileCount: result.fileCount } }
      },
    })
  })

  return () => clients.forEach((client) => client.stop())
}
