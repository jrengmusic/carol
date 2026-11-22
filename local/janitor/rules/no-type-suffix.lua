local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-type-suffix"
Rule.heading = "NAMES.md Rule 2 — Construct expression without data type statement"

local query = Syntax.getQuery ([[
(declaration declarator: (identifier) @name)
(declaration declarator: (init_declarator declarator: (identifier) @name))
(field_declaration declarator: (field_identifier) @name)
(parameter_declaration declarator: (identifier) @name)
(class_specifier name: (type_identifier) @name)
(struct_specifier name: (type_identifier) @name)
]])

local bannedSuffixes = {
    "Int",
    "Float",
    "Double",
    "Bool",
    "Ptr",
    "Ref",
    "Class",
    "Struct",
    "Array",
    "Vec",
}

local function getBannedSuffix (name)
    for index, suffix in ipairs (bannedSuffixes) do
        if #name > #suffix and name:sub (-#suffix) == suffix then
            local before = name:sub (-#suffix - 1, -#suffix - 1)
            if before:match ("[a-z0-9]") ~= nil then
                return suffix
            end
        end
    end
    return nil
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
            local suffix = getBannedSuffix (name)

            if suffix ~= nil then
                local line, lastLine = Syntax.getLineRange (node)
                table.insert (findings, {
                    line = line,
                    lastLine = lastLine,
                    kind = "type suffix `" .. suffix .. "` on `" .. name .. "`",
                    action = "flag",
                    reason = "name the semantic role without encoding its data type",
                })
            end
        end
    end)

    return findings
end

return Rule
