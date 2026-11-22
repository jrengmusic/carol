local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-c-casts"
Rule.heading = "CODING.md **Use modern casts:**"

local query = Syntax.getQuery ([[
(cast_expression) @cast
]])

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        local line, lastLine = Syntax.getLineRange (node)
        table.insert (findings, {
            line = line,
            lastLine = lastLine,
            kind = "C-style cast",
            action = "flag",
            reason = "replace with static_cast, const_cast, or justified reinterpret_cast",
        })
    end)

    return findings
end

return Rule
