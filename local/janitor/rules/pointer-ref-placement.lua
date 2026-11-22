local Syntax = require ("syntax")

local Rule = {}

Rule.id = "pointer-ref-placement"
Rule.heading = "CODING.md **Asterisk/ampersand placement:**"

local query = Syntax.getQuery ([[
(pointer_declarator) @decl
(reference_declarator) @decl
(abstract_pointer_declarator) @decl
(abstract_reference_declarator) @decl
]])

local function getOperatorToken (node, document)
    local firstChild = node:child (0)
    if firstChild == nil then return nil end
    local token = Syntax.getText (document, firstChild)
    if token == "*" or token == "&" or token == "&&" then
        return firstChild, token
    end
    return nil
end

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        local opNode, token = getOperatorToken (node, document)

        if opNode ~= nil then
            local startRow, startColumn, endRow, endColumn = opNode:range()
            local line = startRow + 1
            local lineText = document.lines[line]

            if startColumn > 0 and lineText:sub (startColumn, startColumn) == " " then
                local beforeOp = lineText:sub (1, startColumn)
                local trimmedBefore = beforeOp:gsub (" +$", "")
                local prevChar = trimmedBefore:sub (-1, -1)

                if prevChar ~= "" and prevChar ~= "(" and prevChar ~= "," and prevChar ~= "*" and prevChar ~= "&" then
                    local nextChar = lineText:sub (endColumn + 1, endColumn + 1)
                    local needsSpaceAfter = nextChar ~= "" and nextChar ~= " " and nextChar ~= ")" and nextChar ~= "," and nextChar ~= ">" and nextChar ~= "*" and nextChar ~= "&" and nextChar ~= ";"
                    local finding = {
                        line = line,
                        lastLine = line,
                        kind = "`" .. token .. "` detached from type",
                        action = "fix",
                    }

                    if Syntax.isInsideError (node) then
                        finding.action = "flag"
                        finding.reason = "inside a parse-error region"
                    elseif document.hasCarriageReturn then
                        finding.action = "flag"
                        finding.reason = "CRLF line endings"
                    else
                        finding.edits = {
                            {
                                line = line,
                                startColumn = #trimmedBefore,
                                endColumn = endColumn,
                                text = token .. (needsSpaceAfter and " " or ""),
                            },
                        }
                    end

                    table.insert (findings, finding)
                end
            end
        end
    end)

    return findings
end

return Rule
