const SESSION_TOOLS = ['sed', 'gsed', 'awk', 'gawk', 'mawk', 'nawk', 'grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack', 'jq', 'cat', 'bat', 'head', 'tail', 'cut']
const SCRIPT_TOOLS = ['python', 'python3', 'lua', 'luajit']
const SUBAGENT_TOOLS = [...SESSION_TOOLS, ...SCRIPT_TOOLS, 'perl', 'ruby', 'node']

const COMMAND_START = '(?:^|[;&|\\n(`{]|-exec(?:dir)?\\s|(?:^|[\\s;])(?:if|then|elif|else|do|while|until|!)\\s)\\s*'
const XARGS = 'xargs(?:\\s+-\\S+(?:\\s+(?:\\d+|\\{\\}))?)*'
const COMMAND_PREFIX = '(?:(?:\\w+=\\S*|sudo|exec|time|nohup|nice|command|builtin|env|timeout\\s+\\S+|' + XARGS + ')\\s+)*'
const COMMAND_HEAD = COMMAND_START + COMMAND_PREFIX + '(?:\\S*/)?'
const COMMAND_END = '(?=[\\s;&|)`}]|$)'
const PERL_IN_PLACE_PATTERN = new RegExp(COMMAND_HEAD + 'perl\\s+(?:[^|;&]*\\s)?-[A-Za-z0-9]*i[A-Za-z.]*(?:[\\s=]|$)')
const PERL_STREAM_PATTERN = new RegExp(COMMAND_HEAD + 'perl\\s+(?:[^|;&]*\\s)?-[A-Za-z0-9]*[np][A-Za-z0-9.]*(?:[\\s=]|$)')
const PYTHON_COMMAND_PATTERN = new RegExp(COMMAND_HEAD + 'python3?\\s+(?:[^|;&]*\\s)?-c(?:\\s|$)')
const NODE_EVAL_PATTERN = new RegExp(COMMAND_HEAD + 'node\\s+(?:[^|;&]*\\s)?(?:-e|--eval|-p|--print)(?:\\s|$)')
const STREAM_PATTERNS = [['perl', PERL_IN_PLACE_PATTERN], ['perl', PERL_STREAM_PATTERN], ['python', PYTHON_COMMAND_PATTERN], ['node', NODE_EVAL_PATTERN]]
const TAIL_FOLLOW_PATTERN = /\btail\s+(?:[^|;&\n]*\s)?(?:-[A-Za-z0-9]*[fF][A-Za-z0-9]*|--follow\S*)(?=\s|$)/g
const NESTED_SHELL_PATTERN = new RegExp(COMMAND_HEAD + '(?:bash|sh|zsh|dash)(?:\\s+(?:-\\w*[cs]\\b|<<)|\\s*(?:$|[;&|\\n]))')
const SAW_APPLY_PATTERN = new RegExp(COMMAND_HEAD + 'saw\\s[^;&|\\n]*--apply\\b')
const SAW_EXCERPT_PATTERN =new RegExp(COMMAND_HEAD + 'saw\\s+excerpt(?:\\s|$)')
const TEE_PATTERN = new RegExp(COMMAND_HEAD + 'tee\\s+([^;&|\\n]*)', 'g')
const REDIRECT_PATTERN = /(?<![-=<>])(?:\d|&)?>{1,2}\|?\s*(?![&(>])([^\s;&|()<>]+)/g
const HEREDOC_PATTERN = /<<-?\s*(["']?)([A-Za-z_]\w*)\1([^\n]*)\n(?:[\s\S]*?\n)?[ \t]*\2[ \t]*(?=\n|$)/g
const QUOTED_PATTERN = /'[^']*'|"(?:\\[\s\S]|[^"\\])*"|\\[\s\S]|(?<=^|\s)#[^\n]*/g
const REDIRECT_BEFORE_PATTERN = />\|?\s*$/
const SUBSTITUTION_PATTERN = /\$\(|`/
const ASSIGNMENT_PATTERN = /(?:^|[\s;&])([A-Za-z_]\w*)=(\$\(mktemp[^)]*\)|[^\s;&|]+)/g
const VARIABLE_PATTERN = /\$\{?([A-Za-z_]\w*)\}?/g
const DIRECTORY_PATTERN = /(?:^|[;&|\n(]\s*)cd\s+([^\s;&|)]+)/g
const TEMPORARY_PATTERN = /^(?:\/dev\/|\/(?:private\/)?tmp(?:\/|$)|\/(?:private\/)?var\/folders\/|\$\(mktemp|\$\{?(?:TMPDIR|TEMP|TMP)\b)|[\\/]scratchpad(?:[\\/]|$)|[\\/]AppData[\\/]Local[\\/]Temp(?:[\\/]|$)/
const ABSOLUTE_PATTERN = /^(?:[\\/~]|[A-Za-z]:)/
const BLOCK_HEADER_PATTERN = /^## \d+ (.+:\d+-\d+ of \d+ sha256:[0-9a-f]{16}(?: escaped)?)\s*$/
const BLOCK_LINE_PATTERN = /^\d+(?:\t|$)/
const CITATION_PATTERN = /[\w.~/\\-]+\.[A-Za-z]\w*:\d+/
const EVIDENCE_PATTERN = /^\W*EVIDENCE\b/m

const APPLY_AGENT = 'engineer'
const EXCERPT_AGENT = 'pathfinder'
const DOXYGEN_TASK_PATTERN = /doxygen/i
const DENIAL_EXIT = 2

const SAW_ROWS = [
  [['sed', 'gsed', 'Edit'], 'saw replace <find> <with> <path>, then --apply --expect <N> (also saw lines, saw patch)', '["replace", "<find>", "<with>", "<path>"], then "--apply", "--expect", "<N>"'],
  [['awk', 'gawk', 'mawk', 'nawk', 'cut'], 'saw fields <spec> <path>', '["fields", "<spec>", "<path>"]'],
  [['grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack'], 'saw find <pattern> <path> (-r for regex)', '["find", "<pattern>", "<path>"]'],
  [['jq'], 'saw json <filter> <file>', '["json", "<filter>", "<file>"]'],
  [['cat', 'bat'], 'saw page <path>', '["page", "<path>"]'],
  [['head'], 'saw page -r :<N> <path>', '["page", "-r", ":<N>", "<path>"]'],
  [['tail'], 'saw page -r -<N>: <path>', '["page", "-r", "-<N>:", "<path>"]'],
  [['write', 'Write'], 'saw write <path> --apply --expect 1 < text', '["write", "<path>", "--apply", "--expect", "1"], the text in stdin'],
  [['python', 'lua', 'perl', 'ruby', 'node', 'bash'], 'saw find <pattern> <path>, saw json <filter> <file>, saw fields <spec> <path>, saw page <path>', '["find", "<pattern>", "<path>"], ["json", "<filter>", "<file>"], ["fields", "<spec>", "<path>"], ["page", "<path>"]'],
]
const SAW_CALLS = new Map(SAW_ROWS.flatMap(([tools, cli, mcp]) => tools.map((tool) => [tool, { cli, mcp }])))
export const APPLY_GATE = 'This subagent does not edit files. Only Engineer, and Pathfinder in a doxygen task, run saw with --apply. Report what must change.'
const EXCERPT_MISSING_GATE = 'The report cites file lines and holds no excerpt block. Run "saw excerpt <absolute path>:<A>-<B> ..." with every cited target, and put its output in the report exactly as saw printed it: each ## header and every numbered line. Use no paraphrase.'
const EXCERPT_CHANGED_GATE = 'These excerpt blocks differ from the output of saw. Copy each one again exactly as saw printed it, the ## header and every numbered line, or remove it:'

function getPattern(tools) {
  return new RegExp(COMMAND_HEAD + '(' + tools.join('|') + ')' + COMMAND_END)
}

const SESSION_PATTERN = getPattern(SESSION_TOOLS)
const SUBAGENT_PATTERN = getPattern(SUBAGENT_TOOLS)
const SCRIPT_PATTERN = getPattern(SCRIPT_TOOLS)

// Text inside quotes, comments and heredoc bodies is data, not a command.
export function getUnquoted(command) {
  const withoutHeredocs = command.replace(HEREDOC_PATTERN, '<<$2$3')
  return withoutHeredocs.replace(QUOTED_PATTERN, (quoted, offset, text) => {
    if (quoted.startsWith('#')) return ''
    if (quoted.startsWith('\\')) return quoted === '\\\n' ? ' ' : '_'
    if (REDIRECT_BEFORE_PATTERN.test(text.slice(0, offset))) return quoted.slice(1, -1).replace(/\s/g, '_')
    return quoted.startsWith('"') && SUBSTITUTION_PATTERN.test(quoted) ? quoted : '""'
  })
}

function getExpanded(text, assignments) {
  return text.replace(/^["']|["']$/g, '').replace(VARIABLE_PATTERN, (variable, name) => assignments.get(name) ?? variable)
}

export function isTemporaryPath(target) {
  return TEMPORARY_PATTERN.test(target)
}

function hasProjectRedirect(unquoted) {
  const assignments = new Map([...unquoted.matchAll(ASSIGNMENT_PATTERN)].map((match) => [match[1], match[2]]))
  const directory = getExpanded([...unquoted.matchAll(DIRECTORY_PATTERN)].at(-1)?.[1] ?? '', assignments)
  const redirects = [...unquoted.matchAll(REDIRECT_PATTERN)].map((match) => match[1])
  const tees = [...unquoted.matchAll(TEE_PATTERN)].flatMap((match) => match[1].split(/\s+/).filter((word) => word !== '' && !/^[-<>\d]/.test(word)))
  return [...redirects, ...tees]
    .map((target) => getExpanded(target, assignments))
    .some((target) => !isTemporaryPath(target) && (ABSOLUTE_PATTERN.test(target) || !isTemporaryPath(directory)))
}

export function isApplyAgent(agentType, description) {
  const type = agentType.toLowerCase()
  return type === APPLY_AGENT || (type === EXCERPT_AGENT && DOXYGEN_TASK_PATTERN.test(description))
}

export function isExcerptAgent(agentType) {
  return agentType.toLowerCase() === EXCERPT_AGENT
}

function getDeniedTool(unquoted, isSubagent) {
  const masked = unquoted.replace(TAIL_FOLLOW_PATTERN, ' ')
  const stream = STREAM_PATTERNS.find(([, pattern]) => pattern.test(masked))
  if (stream !== undefined) return stream[0]
  return (isSubagent ? SUBAGENT_PATTERN : SESSION_PATTERN).exec(masked)?.[1]
}

// The denial text of one denied tool: its saw call on the command line and on the MCP tool.
export function getToolDenial(tool, mcpToolName) {
  const { cli, mcp } = SAW_CALLS.get(tool)
  return tool + ' is denied (CAROL.md Destructive-Edit Discipline). Use saw. CLI: ' + cli + '. MCP ' + mcpToolName + ': ' + mcp + '. Help: saw <verb> --help.'
}

export function getScriptDenial(mcpToolName) {
  return "A python or lua script needs ARCHITECT's approval (CAROL.md Destructive-Edit Discipline). " + getToolDenial('python', mcpToolName)
}

// The denial text of a shell command, or undefined.
export function getShellDenial(command, isSubagent, canApply, mcpToolName) {
  const unquoted = getUnquoted(command)
  const tool = getDeniedTool(unquoted, isSubagent)
  if (tool !== undefined) return getToolDenial(tool, mcpToolName)
  if (isSubagent && NESTED_SHELL_PATTERN.test(unquoted)) return getToolDenial('bash', mcpToolName)
  if (hasProjectRedirect(unquoted)) return getToolDenial('write', mcpToolName)
  return isSubagent && SAW_APPLY_PATTERN.test(unquoted) && !canApply ? APPLY_GATE : undefined
}

export function isScriptRun(command) {
  return SCRIPT_PATTERN.test(getUnquoted(command))
}

// A shell function covers the positions that a pattern cannot read.
export function getGuardedCommand(command, isSubagent) {
  const unquoted = getUnquoted(command).replace(TAIL_FOLLOW_PATTERN, ' ')
  const named = (isSubagent ? SUBAGENT_TOOLS : SESSION_TOOLS).filter((tool) => new RegExp('\\b' + tool + '\\b').test(unquoted))
  const functions = named.map((tool) => 'function ' + tool + " { echo 'CAROL: " + tool + " is denied, use saw (an installed command)' >&2; return " + DENIAL_EXIT + '; }; ')
  return functions.join('') + command
}

export function isSawExcerpt(command) {
  return SAW_EXCERPT_PATTERN.test(getUnquoted(command))
}

// The denial text of a saw MCP call, or undefined.
export function getRunDenial(args, isSubagent, canApply) {
  return isSubagent && !canApply && args.includes('--apply') ? APPLY_GATE : undefined
}

// header -> numbered lines, for each excerpt block of the text.
export function getExcerptBlocks(text) {
  const blocks = {}
  let header
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(BLOCK_HEADER_PATTERN)
    if (match) {
      header = match[1]
      blocks[header] = []
    } else if (header !== undefined && BLOCK_LINE_PATTERN.test(line)) {
      blocks[header].push(line.trimEnd())
    } else {
      header = undefined
    }
  }
  return blocks
}

// The text that sends a report back, or undefined. getSourceLines gives the lines that saw printed for a header.
export function getReportDenial(report, getSourceLines) {
  const blocks = Object.entries(getExcerptBlocks(report))
  const isCitation = CITATION_PATTERN.test(report) && !EVIDENCE_PATTERN.test(report)
  if (blocks.length === 0) return isCitation ? EXCERPT_MISSING_GATE : undefined
  const changed = blocks.filter(([header, lines]) => getSourceLines(header)?.join('\n') !== lines.join('\n'))
  return changed.length === 0 ? undefined : [EXCERPT_CHANGED_GATE, ...changed.map(([header]) => header)].join('\n')
}
