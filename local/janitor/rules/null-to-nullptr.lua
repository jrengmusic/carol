local Syntax = require ("syntax")

local Rule = {}

Rule.id = "null-to-nullptr"
Rule.heading = "CODING.md **NULL:**"

local query = Syntax.getQuery ([[
(null) @null
]])

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        if Syntax.getText (document, node) == "NULL" then
            local startRow, startColumn, endRow, endColumn = node:range()
            local line = startRow + 1
            local finding = {
                line = line,
                lastLine = line,
                kind = "`NULL` macro",
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
                        startColumn = startColumn,
                        endColumn = endColumn,
                        text = "nullptr",
                    },
                }
            end

            table.insert (findings, finding)
        end
    end)

    return findings
end

return Rule
