local Syntax = require ("syntax")

local Rule = {}

Rule.id = "forbidden-terms"
Rule.heading = "NAMES.md Rule 6 — Forbidden Terms"

local query = Syntax.getQuery ([[
(declaration declarator: (identifier) @name)
(declaration declarator: (init_declarator declarator: (identifier) @name))
(field_declaration declarator: (field_identifier) @name)
(parameter_declaration declarator: (identifier) @name)
(function_declarator declarator: (identifier) @name)
(function_declarator declarator: (field_identifier) @name)
(class_specifier name: (type_identifier) @name)
(struct_specifier name: (type_identifier) @name)
]])

local forbiddenWords = {
    graft = "use `attach`",
    node = "use the actual tree type name",
    seed = "banned outright",
    handler = "name the contract (callbacks, events, parameters)",
    handlers = "name the contract (callbacks, events, parameters)",
    kind = "use `Type`",
    resolve = "use `get`, `set`, `find`, `is...`, or `has...`",
    ensure = "use `get`, `getOrCreate`, or `cache`",
    emitter = "name the produced thing or real operation",
    emitters = "name the produced thing or real operation",
}

local function splitWords (identifier)
    local words = {}
    local normalized = identifier:gsub ("([a-z0-9])([A-Z])", "%1_%2"):gsub ("([A-Z]+)([A-Z][a-z])", "%1_%2")
    for word in normalized:gmatch ("[A-Za-z0-9]+") do
        table.insert (words, word:lower())
    end
    return words
end

function Rule.getFindings (document)
    local findings = {}
    local seen = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        local startRow, startColumn = node:range()
        local key = startRow .. ":" .. startColumn
        if not seen[key] then
            seen[key] = true
            local name = Syntax.getText (document, node)

            for index, word in ipairs (splitWords (name)) do
                local guidance = forbiddenWords[word]
                if guidance ~= nil then
                    local line, lastLine = Syntax.getLineRange (node)
                    table.insert (findings, {
                        line = line,
                        lastLine = lastLine,
                        kind = "forbidden term `" .. word .. "` in `" .. name .. "`",
                        action = "flag",
                        reason = guidance,
                    })
                    break
                end
            end
        end
    end)

    return findings
end

return Rule
