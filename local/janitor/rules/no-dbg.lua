local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-dbg"
Rule.heading = "CODING.md ## DIAGNOSTICS (MANDATORY)"

local query = Syntax.getQuery ([[
(call_expression function: (identifier) @fn)
]])

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        if Syntax.getText (document, node) == "DBG" then
            local line, lastLine = Syntax.getLineRange (node)
            table.insert (findings, {
                line = line,
                lastLine = lastLine,
                kind = "`DBG` macro call",
                action = "flag",
                reason = "remove or replace with debug::Log",
            })
        end
    end)

    return findings
end

return Rule
