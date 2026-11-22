local Ling = require ("ling")
local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-implicit-null-check"
Rule.heading = "CODING.md **Null checks:**"

local query = Syntax.getQuery ([[
(if_statement condition: (condition_clause value: (identifier) @ident))
(if_statement condition: (condition_clause value: (unary_expression operator: "!" argument: (identifier) @ident)))
(if_statement condition: (condition_clause value: (unary_expression operator: "not" argument: (identifier) @ident)))
]])

local function isPointerHover (hoverText)
    if hoverText == nil then return false end
    local typeLine = hoverText:match ("Type:%s*([^\n]+)") or hoverText:match ("→%s*([^\n]+)")
    if typeLine ~= nil then
        return typeLine:find ("*", 1, true) ~= nil
    end
    return false
end

function Rule.getFindings (document)
    local findings = {}

    if Ling.getManifest (document.path) == nil then
        return findings
    end

    Syntax.applyToCaptures (document, query, function (captureName, node)
        local startRow, startColumn = node:range()
        local hover = Ling.getHover (document.path, startRow + 1, startColumn + 1)

        if isPointerHover (hover) then
            local name = Syntax.getText (document, node)
            local line, lastLine = Syntax.getLineRange (node)
            table.insert (findings, {
                line = line,
                lastLine = lastLine,
                kind = "implicit null check on pointer `" .. name .. "`",
                action = "flag",
                reason = "compare explicitly with == nullptr or != nullptr",
            })
        end
    end)

    return findings
end

return Rule
