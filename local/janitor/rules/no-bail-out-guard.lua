local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-bail-out-guard"
Rule.heading = "CODING.md **No bail-out guards**"

local query = Syntax.getQuery ([[
(if_statement condition: (condition_clause value: (unary_expression operator: "!" @op)) consequence: (_) @consequence) @stmt
(if_statement condition: (condition_clause value: (unary_expression operator: "not" @op)) consequence: (_) @consequence) @stmt
]])

local function isVoidReturn (node)
    local ret = nil
    if node:type() == "return_statement" then
        ret = node
    elseif node:type() == "compound_statement" and node:named_child_count() == 1 then
        local only = node:named_child (0)
        if only ~= nil and only:type() == "return_statement" then
            ret = only
        end
    end

    if ret == nil then return false end
    return ret:named_child_count() == 0
end

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToMatches (document, query, function (captures)
        if captures.stmt:field ("alternative")[1] == nil and isVoidReturn (captures.consequence) then
            local line, lastLine = Syntax.getLineRange (captures.stmt)
            table.insert (findings, {
                line = line,
                lastLine = lastLine,
                kind = "negated void bail-out guard",
                action = "flag",
                reason = "replace with assert precondition or positive nesting",
            })
        end
    end)

    return findings
end

return Rule
