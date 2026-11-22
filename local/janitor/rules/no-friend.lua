local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-friend"
Rule.heading = "CODING.md **No `friend` declarations:**"

local query = Syntax.getQuery ([[
(friend_declaration) @friend
]])

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        local line, lastLine = Syntax.getLineRange (node)
        table.insert (findings, {
            line = line,
            lastLine = lastLine,
            kind = "`friend` declaration",
            action = "flag",
            reason = "redesign the public API instead of bypassing encapsulation",
        })
    end)

    return findings
end

return Rule
