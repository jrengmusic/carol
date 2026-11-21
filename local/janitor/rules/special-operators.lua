-- CODING.md **Special operators:** use not, and, or; never !, &&, ||.
local Syntax = require ("syntax")

local Rule = {}

Rule.id = "special-operators"
Rule.heading = "CODING.md **Special operators:**"

local query = Syntax.getQuery ([[
(unary_expression operator: "!" @operator)
(binary_expression operator: "&&" @operator)
(binary_expression operator: "||" @operator)
]])

local alternativeTokens = { ["!"] = "not", ["&&"] = "and", ["||"] = "or" }
local space = " "
-- Preprocessor directives keep !, &&, || (CODING.md **Special operators:**).
local preprocessorConditionals = { preproc_if = true, preproc_elif = true }

local function isInsidePreprocessorCondition (node)
    local parent = node:parent()

    while parent ~= nil do
        if preprocessorConditionals[parent:type()] then
            local condition = parent:field ("condition")[1]
            if condition ~= nil and (condition:equal (node) or vim.treesitter.is_ancestor (condition, node)) then return true end
        end

        parent = parent:parent()
    end

    return false
end

local function getReplacement (token, before, after)
    local replacement = alternativeTokens[token]

    if token == "!" then
        if after == space then return replacement end
        return replacement .. space
    end

    if before ~= space then replacement = space .. replacement end
    if after ~= space then replacement = replacement .. space end
    return replacement
end

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        if not isInsidePreprocessorCondition (node) then
            local token = Syntax.getText (document, node)
            local row, column, endRow, endColumn = node:range()
            local line = row + 1
            local text = document.lines[line]
            local finding = { line = line, lastLine = line, kind = "`" .. token .. "` operator", action = "fix" }

            if Syntax.isInsideError (node) then
                finding.action = "flag"
                finding.reason = "inside a parse-error region"
            elseif document.hasCarriageReturn then
                finding.action = "flag"
                finding.reason = "CRLF line endings"
            else
                local before = text:sub (column, column)
                local after = text:sub (endColumn + 1, endColumn + 1)
                finding.edits = { { line = line, startColumn = column, endColumn = endColumn, text = getReplacement (token, before, after) } }
            end

            table.insert (findings, finding)
        end
    end)

    return findings
end

return Rule
