local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-raw-new-delete"
Rule.heading = "CODING.md ## MEMORY MANAGEMENT"

local newDeleteQuery = Syntax.getQuery ([[
(new_expression) @expr
(delete_expression) @expr
]])

local callQuery = Syntax.getQuery ([[
(call_expression function: (identifier) @fn)
]])

local bannedCalls = {
    malloc = true,
    calloc = true,
    realloc = true,
    free = true,
    memset = true,
}

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, newDeleteQuery, function (captureName, node)
        local line, lastLine = Syntax.getLineRange (node)
        local kind = node:type() == "new_expression" and "raw `new` expression" or "raw `delete` expression"
        table.insert (findings, {
            line = line,
            lastLine = lastLine,
            kind = kind,
            action = "flag",
            reason = "use stack allocation, std::unique_ptr, or juce::HeapBlock",
        })
    end)

    Syntax.applyToCaptures (document, callQuery, function (captureName, node)
        local name = Syntax.getText (document, node)
        if bannedCalls[name] then
            local line, lastLine = Syntax.getLineRange (node)
            table.insert (findings, {
                line = line,
                lastLine = lastLine,
                kind = "C memory call `" .. name .. "`",
                action = "flag",
                reason = "replace with C++ RAII or zerostruct/zeromem",
            })
        end
    end)

    return findings
end

return Rule
