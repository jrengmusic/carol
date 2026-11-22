local Ling = require ("ling")
local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-string-equality"
Rule.heading = "CODING.md **No `==` / `!=` on strings.**"

local query = Syntax.getQuery ([[
(binary_expression left: (_) @left operator: "==" @op right: (_) @right) @expr
(binary_expression left: (_) @left operator: "!=" @op right: (_) @right) @expr
]])

local function isStringTypeHover (hoverText)
    if hoverText == nil then return false end
    return hoverText:find ("juce::String", 1, true) ~= nil
        or hoverText:find ("std::string", 1, true) ~= nil
        or hoverText:find ("basic_string", 1, true) ~= nil
        or hoverText:find ("StringRef", 1, true) ~= nil
end

local function isStringOperand (document, node)
    if node:type() == "string_literal" then return true end
    if node:type() == "identifier" or node:type() == "field_expression" then
        local target = node:type() == "field_expression" and node:field ("field")[1] or node
        if target ~= nil then
            local startRow, startColumn = target:range()
            local hover = Ling.getHover (document.path, startRow + 1, startColumn + 1)
            return isStringTypeHover (hover)
        end
    end
    return false
end

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToMatches (document, query, function (captures)
        if isStringOperand (document, captures.left) or isStringOperand (document, captures.right) then
            local op = Syntax.getText (document, captures.op)
            local line, lastLine = Syntax.getLineRange (captures.expr)
            table.insert (findings, {
                line = line,
                lastLine = lastLine,
                kind = "string `" .. op .. "` comparison",
                action = "flag",
                reason = "dispatch by key or use String::compare",
            })
        end
    end)

    return findings
end

return Rule
