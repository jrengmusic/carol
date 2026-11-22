local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-pair-first-second"
Rule.heading = "CODING.md ## STRUCTURED BINDINGS"

local fieldQuery = Syntax.getQuery ([[
(field_expression field: (field_identifier) @field)
]])

local bindingQuery = Syntax.getQuery ([[
(structured_binding_declarator (identifier) @name)
]])

local bannedFields = { first = true, second = true }
local bannedBindings = { ["_"] = true, it = true }

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, fieldQuery, function (captureName, node)
        local name = Syntax.getText (document, node)
        if bannedFields[name] then
            local line, lastLine = Syntax.getLineRange (node)
            table.insert (findings, {
                line = line,
                lastLine = lastLine,
                kind = "pair access `." .. name .. "`",
                action = "flag",
                reason = "use descriptive structured bindings instead of .first/.second",
            })
        end
    end)

    Syntax.applyToCaptures (document, bindingQuery, function (captureName, node)
        local name = Syntax.getText (document, node)
        if bannedBindings[name] then
            local line, lastLine = Syntax.getLineRange (node)
            table.insert (findings, {
                line = line,
                lastLine = lastLine,
                kind = "forbidden structured binding `" .. name .. "`",
                action = "flag",
                reason = "rename to a descriptive binding name",
            })
        end
    end)

    return findings
end

return Rule
