const SESSION_TOOLS = ['sed', 'gsed', 'awk', 'gawk', 'mawk', 'nawk']
const SCRIPT_TOOLS = ['python', 'python3', 'lua', 'luajit']
const SUBAGENT_TOOLS = [...SESSION_TOOLS, ...SCRIPT_TOOLS, 'grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack', 'perl', 'ruby', 'node']

const COMMAND_START = '(?:^|[;&|\\n(`{]|-exec(?:dir)?\\s|(?:^|[\\s;])(?:if|then|elif|else|do|while|until|!)\\s)\\s*'
const XARGS = 'xargs(?:\\s+-\\S+(?:\\s+(?:\\d+|\\{\\}))?)*'
const COMMAND_PREFIX = '(?:(?:\\w+=\\S*|sudo|exec|time|nohup|nice|command|builtin|env|timeout\\s+\\S+|' + XARGS + ')\\s+)*'
const COMMAND_HEAD = COMMAND_START + COMMAND_PREFIX + '(?:\\S*/)?'
const COMMAND_END = '(?=[\\s;&|)`}]|$)'
const PERL_IN_PLACE_PATTERN = new RegExp(COMMAND_HEAD + 'perl\\s+(?:[^|;&]*\\s)?-[A-Za-z0-9]*i[A-Za-z.]*(?:[\\s=]|$)')
const NESTED_SHELL_PATTERN = new RegExp(COMMAND_HEAD + '(?:bash|sh|zsh|dash)(?:\\s+(?:-\\w*[cs]\\b|<<)|\\s*(?:$|[;&|\\n]))')
const SAW_APPLY_PATTERN = new RegExp(COMMAND_HEAD + 'saw\\s[^;&|\\n]*--apply\\b')
const SAW_FIND_PATTERN = new RegExp(COMMAND_HEAD + 'saw\\s+find(?:\\s|$)')
const FILE_LIST_PATTERN = /\s--files(?:\s|$)/
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
const CPP_ARGUMENT_PATTERN = /\.(?:h|hh|hpp|hxx|inl|c|cc|cpp|cxx|m|mm)$/
const BLOCK_HEADER_PATTERN = /^## \d+ (.+:\d+-\d+ of \d+ sha256:[0-9a-f]{16}(?: escaped)?)\s*$/
const BLOCK_LINE_PATTERN = /^\d+(?:\t|$)/
const CITATION_PATTERN = /[\w.~/\\-]+\.[A-Za-z]\w*:\d+/
const EVIDENCE_PATTERN = /^\W*EVIDENCE\b/m

const APPLY_AGENT = 'engineer'
const EXCERPT_AGENT = 'pathfinder'
const DOXYGEN_TASK_PATTERN = /doxygen/i
const DENIAL_EXIT = 2

const SAW_USE = 'saw is an installed command, not a typo of sed. Search: saw find <literal> <path> (-r for a regex). Exact lines: saw excerpt <path>:<A>-<B>. Columns: saw fields. Pipe filter: saw find <literal> with no path. Edit: saw replace, saw lines or saw patch, first with no flag to preview, then with --apply --expect N. Undo: saw undo. "saw <verb> --help" gives the flags.'

export const SESSION_GATE = 'sed, awk and an in-place perl are denied in every session (CAROL.md Destructive-Edit Discipline). ' + SAW_USE
export const SUBAGENT_GATE = 'A subagent does file work only with saw. sed, awk, grep, rg, python, perl, lua, ruby, node and a nested shell (bash -c) are denied (CAROL.md Destructive-Edit Discipline). ' + SAW_USE
export const SCRIPT_GATE = "A python or lua script needs ARCHITECT's approval (CAROL.md Destructive-Edit Discipline). " + SAW_USE
export const REDIRECT_GATE ='A subagent does not write a project file with > or tee (CAROL.md Destructive-Edit Discipline). Edit with saw. Create a new file with the Write tool. Put a log or other output in the scratchpad or in /tmp, with the full path in the command.'
export const WRITE_GATE = 'A subagent uses the Write tool for a new file only, and this file exists (CAROL.md Destructive-Edit Discipline). ' + SAW_USE
export const EDIT_GATE = 'A session edits a file only with saw, not with an edit tool (CAROL.md Destructive-Edit Discipline). ' + SAW_USE
export const APPLY_GATE = 'This subagent does not edit files. Only Engineer, and Pathfinder in a doxygen task, run saw with --apply. Report what must change.'
export const SEARCH_GATE = 'A text search on C++ source is not allowed (doxygen-protocol skill). Use the doxygen XML index to find what exists. Use the ling MCP tools to find definitions, references, implementations and call hierarchy. A text search on C++ source is allowed only for a string literal or a preprocessor directive: put the double quote or the # in the search pattern.'
const EXCERPT_MISSING_GATE = 'The report cites file lines and holds no excerpt block. Run "saw excerpt <absolute path>:<A>-<B> ..." with every cited target, and put its output in the report exactly as saw printed it: each ## header and every numbered line. Use no paraphrase.'
const EXCERPT_CHANGED_GATE = 'These excerpt blocks differ from the output of saw. Copy each one again exactly as saw printed it, the ## header and every numbered line, or remove it:'

function getPattern(tools) {
  return new RegExp(COMMAND_HEAD + '(?:' + tools.join('|') + ')' + COMMAND_END)
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

// The denial text of a shell command, or undefined.
export function getShellDenial(command, isSubagent, canApply) {
  const unquoted = getUnquoted(command)
  if (!isSubagent) return SESSION_PATTERN.test(unquoted) || PERL_IN_PLACE_PATTERN.test(unquoted) ? SESSION_GATE : undefined
  if (SUBAGENT_PATTERN.test(unquoted) || NESTED_SHELL_PATTERN.test(unquoted)) return SUBAGENT_GATE
  if (hasProjectRedirect(unquoted)) return REDIRECT_GATE
  return SAW_APPLY_PATTERN.test(unquoted) && !canApply ? APPLY_GATE : undefined
}

export function isScriptRun(command) {
  return SCRIPT_PATTERN.test(getUnquoted(command))
}

// A shell function covers the positions that a pattern cannot read.
export function getGuardedCommand(command, isSubagent) {
  const unquoted = getUnquoted(command)
  const named = (isSubagent ? SUBAGENT_TOOLS : SESSION_TOOLS).filter((tool) => new RegExp('\\b' + tool + '\\b').test(unquoted))
  const functions = named.map((tool) => 'function ' + tool + " { echo 'CAROL: " + tool + " is denied, use saw (an installed command)' >&2; return " + DENIAL_EXIT + '; }; ')
  return functions.join('') + command
}

// Each saw find call of a command that searches text. A separator inside quotes does not end a call.
export function getSawFinds(command) {
  const masked = command.replace(HEREDOC_PATTERN, '<<$2$3').replace(QUOTED_PATTERN, (quoted) => quoted.replace(/[;&|\n]/g, '_'))
  return masked.split(/[;&|\n]+/).filter((segment) => SAW_FIND_PATTERN.test(segment) && !FILE_LIST_PATTERN.test(segment))
}

export function isSawExcerpt(command) {
  return SAW_EXCERPT_PATTERN.test(getUnquoted(command))
}

// The denial text of a saw MCP call, or undefined.
export function getRunDenial(args, isSubagent, canApply) {
  if (isSubagent && !canApply && args.includes('--apply')) return APPLY_GATE
  const isLiteralSearch = args.some((argument) => argument.includes('"') || argument.startsWith('#'))
  const isCppSearch = args[0] === 'find' && args.slice(1).some((argument) => CPP_ARGUMENT_PATTERN.test(argument))
  return isCppSearch && !isLiteralSearch ? SEARCH_GATE : undefined
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
