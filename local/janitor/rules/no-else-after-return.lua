local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-else-after-return"
Rule.heading = "CODING.md **No `else` after `return`.**"

local query = Syntax.getQuery ([[
(if_statement consequence: (_) @consequence alternative: (else_clause) @elseClause)
]])

local function endsWithReturn (node)
    if node:type() == "return_statement" then return true end
    if node:type() == "compound_statement" then
        local count = node:named_child_count()
        if count > 0 then
            local last = node:named_child (count - 1)
            return last ~= nil and last:type() == "return_statement"
        end
    end
    return false
end

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToMatches (document, query, function (captures)
        if endsWithReturn (captures.consequence) then
            local line, lastLine = Syntax.getLineRange (captures.elseClause)
            table.insert (findings, {
                line = line,
                lastLine = line,
                kind = "`else` after `return`",
                action = "flag",
                reason = "remove redundant else branch after return",
            })
        end
    end)

    return findings
end

return Rule
