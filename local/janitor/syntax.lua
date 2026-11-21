-- One parsed C++ file: its text, its lines, and its tree-sitter tree.
local Syntax = {}

local language = "cpp"
local carriageReturn = "\r"

function Syntax.getDocument (path)
    local handle = assert (io.open (path, "rb"), "cannot read " .. path)
    local source = handle:read ("a")
    handle:close()

    local lines = vim.split (source, "\n", { plain = true })
    local hasFinalNewline = lines[#lines] == ""

    if hasFinalNewline then
        table.remove (lines)
    end

    local parser = vim.treesitter.get_string_parser (source, language)
    local root = parser:parse()[1]:root()

    return {
        path = path,
        source = source,
        lines = lines,
        hasFinalNewline = hasFinalNewline,
        hasCarriageReturn = source:find (carriageReturn, 1, true) ~= nil,
        root = root,
    }
end

function Syntax.getQuery (queryText)
    return vim.treesitter.query.parse (language, queryText)
end

-- Calls visit (captureName, node) for each capture, in document order.
function Syntax.applyToCaptures (document, query, visit)
    for id, node in query:iter_captures (document.root, document.source) do
        visit (query.captures[id], node)
    end
end

-- Calls visit (captures) for each match; captures maps a capture name to its node.
function Syntax.applyToMatches (document, query, visit)
    for patternId, match in query:iter_matches (document.root, document.source, 0, -1, { all = true }) do
        local captures = {}

        for id, nodes in pairs (match) do
            captures[query.captures[id]] = nodes[1]
        end

        visit (captures)
    end
end

function Syntax.getText (document, node)
    return vim.treesitter.get_node_text (node, document.source)
end

-- 1-based first and last line of a node.
function Syntax.getLineRange (node)
    local startRow, startColumn, endRow, endColumn = node:range()
    return startRow + 1, endRow + 1
end

function Syntax.isInsideError (node)
    local parent = node:parent()

    while parent ~= nil do
        if parent:type() == "ERROR" then return true end
        parent = parent:parent()
    end

    return false
end

function Syntax.getErrorCount (document)
    local count = 0
    local query = Syntax.getQuery ("(ERROR) @error")

    Syntax.applyToCaptures (document, query, function () count = count + 1 end)
    return count
end

return Syntax
