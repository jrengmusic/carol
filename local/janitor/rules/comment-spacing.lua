local Syntax = require ("syntax")

local Rule = {}

Rule.id = "comment-spacing"
Rule.heading = "CODING.md **Spacing:** (comments)"

local query = Syntax.getQuery ([[
(comment) @comment
]])

local exemptPrefix = {
    [" "] = true,
    ["\t"] = true,
    ["/"] = true,
    ["!"] = true,
    ["="] = true,
    ["-"] = true,
    ["_"] = true,
    ["*"] = true,
}

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        local text = Syntax.getText (document, node)

        if text:sub (1, 2) == "//" and #text > 2 then
            local third = text:sub (3, 3)

            if not exemptPrefix[third] then
                local startRow, startColumn = node:range()
                local line = startRow + 1
                local finding = {
                    line = line,
                    lastLine = line,
                    kind = "missing space after `//`",
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
                            endColumn = startColumn + 2,
                            text = "// ",
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
