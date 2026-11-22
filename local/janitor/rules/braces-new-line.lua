local Syntax = require ("syntax")

local Rule = {}

Rule.id = "braces-new-line"
Rule.heading = "CODING.md ### Braces"

local query = Syntax.getQuery ([[
(compound_statement) @block
(field_declaration_list) @block
(enumerator_list) @block
(declaration_list) @block
]])

local function getIndent (lineText)
    return lineText:match ("^(%s*)") or ""
end

local function isLambdaBody (node)
    local parent = node:parent()
    return parent ~= nil and parent:type() == "lambda_expression"
end

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        local startRow, startColumn, endRow, endColumn = node:range()
        local line = startRow + 1
        local lastLine = endRow + 1

        if lastLine > line then
            local lineText = document.lines[line]
            local beforeBrace = lineText:sub (1, startColumn)

            if beforeBrace:match ("%S") ~= nil then
                local finding = {
                    line = line,
                    lastLine = line,
                    kind = "opening `{` on same line",
                    action = "fix",
                }

                if Syntax.isInsideError (node) then
                    finding.action = "flag"
                    finding.reason = "inside a parse-error region"
                elseif document.hasCarriageReturn then
                    finding.action = "flag"
                    finding.reason = "CRLF line endings"
                elseif isLambdaBody (node) and lineText:sub (startColumn + 1):match ("^%{%s*$") == nil then
                    finding.action = "flag"
                    finding.reason = "lambda body starts with code on the brace line"
                else
                    local trimmedBefore = beforeBrace:gsub ("%s+$", "")
                    local indent = getIndent (lineText)
                    local afterBrace = lineText:sub (startColumn + 2)
                    finding.edits = {
                        {
                            line = line,
                            startColumn = #trimmedBefore,
                            endColumn = startColumn + 1,
                            text = "\n" .. indent .. "{" .. (afterBrace ~= "" and "" or ""),
                        },
                    }
                end

                table.insert (findings, finding)
            end
        end
    end)

    return findings
end

return Rule
