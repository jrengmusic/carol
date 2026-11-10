#!/usr/bin/env node
'use strict'

const assert = require('node:assert')
const childProcess = require('node:child_process')
const fs = require('node:fs')
const net = require('node:net')
const os = require('node:os')
const path = require('node:path')
const url = require('node:url')

const CLANGD_COMMAND = 'clangd'
const CLANGD_ARGS = [
  '-j=1',
  '--pch-storage=disk',
  '--background-index',
  '--background-index-priority=low',
  '--log=error',
  '--query-driver=/usr/bin/c++,/usr/bin/clang++,/ucrt64/bin/g++'
]
const IDLE_TIMEOUT_MS = 30000
const CONNECT_RETRY_MS = 100
const CONNECT_ATTEMPTS = 50
const HEADER_SEPARATOR = '\r\n\r\n'
const CONTENT_LENGTH_PATTERN = /Content-Length: (\d+)/i
const NO_FRAME = -1
const LANGUAGE_ID = 'cpp'
const UPSTREAM_EXIT_ERROR = { code: -32603, message: 'clangd exited' }
const IS_WINDOWS = process.platform === 'win32'
const PIPE_PATH = IS_WINDOWS
  ? '\\\\.\\pipe\\carol-clangd-' + os.userInfo().username
  : path.join(os.tmpdir(), 'carol-clangd-' + os.userInfo().uid + '.sock')

function send (stream, message) {
  const body = Buffer.from(JSON.stringify({ jsonrpc: '2.0', ...message }))
  stream.write('Content-Length: ' + body.length + HEADER_SEPARATOR)
  stream.write(body)
}

function getFrameEnd (buffered) {
  const headerEnd = buffered.indexOf(HEADER_SEPARATOR)

  if (headerEnd >= 0) {
    const header = buffered.toString('latin1', 0, headerEnd)
    const frameEnd = headerEnd + HEADER_SEPARATOR.length + Number(CONTENT_LENGTH_PATTERN.exec(header)[1])
    if (buffered.length >= frameEnd) return frameEnd
  }

  return NO_FRAME
}

function createReader (onMessage) {
  let buffered = Buffer.alloc(0)

  return (chunk) => {
    buffered = Buffer.concat([buffered, chunk])
    let frameEnd = getFrameEnd(buffered)

    while (frameEnd !== NO_FRAME) {
      const bodyStart = buffered.indexOf(HEADER_SEPARATOR) + HEADER_SEPARATOR.length
      onMessage(JSON.parse(buffered.toString('utf8', bodyStart, frameEnd)))
      buffered = buffered.subarray(frameEnd)
      frameEnd = getFrameEnd(buffered)
    }
  }
}

function getRoot (initializeParams) {
  if (initializeParams.rootUri != null) return initializeParams.rootUri
  assert(initializeParams.rootPath != null, 'initialize carries rootUri or rootPath')
  return url.pathToFileURL(initializeParams.rootPath).href
}

function isDocumentOnDisk (uri) {
  return uri !== undefined && fs.existsSync(url.fileURLToPath(uri))
}

function getUpstreamMessageType (message) {
  if (message.method === undefined) return 'response'
  if (message.id === undefined) return 'notification'
  return 'request'
}

const localResults = {
  'workspace/configuration': (params) => params.items.map(() => null)
}

const upstreamMessages = {
  response: (instance, message) => instance.settle(message),
  request: (instance, message) => send(instance.child.stdin, { id: message.id, result: localResults[message.method]?.(message.params) ?? null }),
  notification: () => {}
}

class ClangdInstance {
  constructor (root, initializeParams) {
    this.root = root
    this.initializeParams = { ...initializeParams, processId: process.pid }
    this.child = null
    this.ready = null
    this.nextId = 0
    this.pending = new Map()
    this.openCounts = new Map()
    this.versions = new Map()
    this.sessions = new Set()
    this.idleTimer = null
  }

  start () {
    if (this.child === null) {
      const child = childProcess.spawn(CLANGD_COMMAND, CLANGD_ARGS, { cwd: url.fileURLToPath(this.root), stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true })
      this.child = child

      if (child.pid !== undefined) os.setPriority(child.pid, os.constants.priority.PRIORITY_LOW)

      child.stdout.on('data', createReader((message) => upstreamMessages[getUpstreamMessageType(message)](this, message)))
      child.stdin.on('error', () => {})
      child.on('error', () => this.release(child))
      child.on('exit', () => this.release(child))
      this.ready = new Promise((resolve) => this.call('initialize', this.initializeParams, resolve))
        .then((response) => this.notifyInitialized(response))
    }

    return this.ready
  }

  notifyInitialized (response) {
    if (this.child !== null) send(this.child.stdin, { method: 'initialized', params: {} })
    return response
  }

  call (method, params, onResponse) {
    clearTimeout(this.idleTimer)
    this.nextId += 1
    this.pending.set(this.nextId, onResponse)
    send(this.child.stdin, { id: this.nextId, method, params })
  }

  settle (response) {
    const onResponse = this.pending.get(response.id)
    this.pending.delete(response.id)
    onResponse(response)

    if (this.pending.size === 0) this.idleTimer = setTimeout(() => this.stop(), IDLE_TIMEOUT_MS)
  }

  request (session, message) {
    this.start().then(() => this.forward(session, message))
  }

  forward (session, message) {
    if (this.child !== null) {
      this.openUpstream(message.params?.textDocument?.uri)
      this.call(message.method, message.params, (response) => session.reply(message.id, response))
    } else {
      session.reply(message.id, { error: UPSTREAM_EXIT_ERROR })
    }
  }

  openUpstream (uri) {
    if (! this.versions.has(uri) && isDocumentOnDisk(uri)) {
      const text = fs.readFileSync(url.fileURLToPath(uri), 'utf8')
      this.versions.set(uri, 1)
      send(this.child.stdin, { method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: LANGUAGE_ID, version: 1, text } } })
    }
  }

  refresh (uri) {
    if (this.versions.has(uri) && isDocumentOnDisk(uri)) {
      const version = this.versions.get(uri) + 1
      const text = fs.readFileSync(url.fileURLToPath(uri), 'utf8')
      this.versions.set(uri, version)
      send(this.child.stdin, { method: 'textDocument/didChange', params: { textDocument: { uri, version }, contentChanges: [{ text }] } })
    }
  }

  open (uri) {
    this.openCounts.set(uri, (this.openCounts.get(uri) ?? 0) + 1)
  }

  close (uri) {
    const count = this.openCounts.get(uri) - 1

    if (count > 0) {
      this.openCounts.set(uri, count)
    } else {
      this.openCounts.delete(uri)

      if (this.versions.has(uri)) {
        this.versions.delete(uri)
        send(this.child.stdin, { method: 'textDocument/didClose', params: { textDocument: { uri } } })
      }
    }
  }

  stop () {
    if (this.child !== null) this.child.kill()
  }

  release (child) {
    if (this.child === child) {
      clearTimeout(this.idleTimer)
      this.child = null
      this.ready = null
      this.versions.clear()
      const settled = [...this.pending.values()]
      this.pending.clear()
      settled.forEach((onResponse) => onResponse({ error: UPSTREAM_EXIT_ERROR }))
    }
  }
}

const instances = new Map()

function getOrCreateInstance (initializeParams) {
  const root = getRoot(initializeParams)
  if (! instances.has(root)) instances.set(root, new ClangdInstance(root, initializeParams))
  return instances.get(root)
}

class Session {
  constructor (socket) {
    this.socket = socket
    this.instance = null
    this.uris = new Set()
  }

  reply (id, response) {
    send(this.socket, { id, result: response.result, error: response.error })
  }

  attach (message) {
    this.instance = getOrCreateInstance(message.params)
    this.instance.sessions.add(this)
    this.instance.start().then((response) => this.reply(message.id, response))
  }

  open (uri) {
    if (! this.uris.has(uri)) {
      this.uris.add(uri)
      this.instance.open(uri)
    }
  }

  close (uri) {
    if (this.uris.has(uri)) {
      this.uris.delete(uri)
      this.instance.close(uri)
    }
  }

  detach () {
    this.uris.forEach((uri) => this.instance.close(uri))
    this.instance.sessions.delete(this)

    if (this.instance.sessions.size === 0) {
      this.instance.stop()
      instances.delete(this.instance.root)
    }
  }
}

const clientMessages = {
  initialize: (session, message) => session.attach(message),
  shutdown: (session, message) => session.reply(message.id, { result: null }),
  exit: (session) => session.socket.end(),
  'textDocument/didOpen': (session, message) => session.open(message.params.textDocument.uri),
  'textDocument/didClose': (session, message) => session.close(message.params.textDocument.uri),
  'textDocument/didChange': (session, message) => session.instance.refresh(message.params.textDocument.uri),
  'textDocument/didSave': (session, message) => session.instance.refresh(message.params.textDocument.uri)
}

function receiveClientMessage (session, message) {
  if (clientMessages[message.method] !== undefined) {
    clientMessages[message.method](session, message)
  } else if (message.id !== undefined) {
    assert(session.instance !== null, 'initialize precedes every request')
    session.instance.request(session, message)
  }
}

function acceptConnection (socket) {
  const session = new Session(socket)
  socket.on('data', createReader((message) => receiveClientMessage(session, message)))
  socket.on('error', () => socket.destroy())
  socket.on('close', () => closeSession(session))
}

function closeSession (session) {
  if (session.instance !== null) {
    session.detach()
    if (instances.size === 0) process.exit(0)
  }
}

function recoverAddress (server, error) {
  assert(error.code === 'EADDRINUSE', error.message)
  const probe = net.connect(PIPE_PATH)
  probe.once('connect', () => process.exit(0))

  probe.once('error', () => {
    if (! IS_WINDOWS) fs.rmSync(PIPE_PATH, { force: true })
    server.listen(PIPE_PATH)
  })
}

function runServer () {
  const server = net.createServer(acceptConnection)
  server.on('error', (error) => recoverAddress(server, error))
  server.listen(PIPE_PATH)
}

function startServer () {
  childProcess.spawn(process.execPath, [__filename, 'server'], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
}

function connectClient (attemptsLeft) {
  const socket = net.connect(PIPE_PATH)

  const retry = () => {
    assert(attemptsLeft > 0, 'carol-clangd server did not start at ' + PIPE_PATH)
    if (attemptsLeft === CONNECT_ATTEMPTS) startServer()
    setTimeout(() => connectClient(attemptsLeft - 1), CONNECT_RETRY_MS)
  }

  socket.once('error', retry)

  socket.once('connect', () => {
    socket.removeListener('error', retry)
    socket.on('error', () => socket.destroy())
    socket.on('close', () => process.exit(0))
    process.stdin.pipe(socket)
    socket.pipe(process.stdout)
  })
}

const modes = {
  client: () => connectClient(CONNECT_ATTEMPTS),
  server: runServer
}

assert(modes[process.argv[2]] !== undefined, 'usage: carol-clangd.js client|server')
modes[process.argv[2]]()
