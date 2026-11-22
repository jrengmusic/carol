local Ling = require ("ling")
local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-variable-underscores"
Rule.heading = "CODING.md **No underscores in any variable name.**"

local query = Syntax.getQuery ([[
(declaration declarator: (identifier) @name)
(declaration declarator: (init_declarator declarator: (identifier) @name))
(declaration declarator: (pointer_declarator declarator: (identifier) @name))
(declaration declarator: (reference_declarator (identifier) @name))
(field_declaration declarator: (field_identifier) @name)
(field_declaration declarator: (pointer_declarator declarator: (field_identifier) @name))
(parameter_declaration declarator: (identifier) @name)
]])

local function toCamelCase (name)
    if name:match ("^_") ~= nil or name:match ("_$") ~= nil then return nil end
    if name:match ("^[mgs]_") ~= nil then return nil end
    if name:match ("^[A-Z0-9_]+$") ~= nil then return nil end

    local converted = name:gsub ("_([a-zA-Z0-9])", function (ch)
        return ch:upper()
    end)

    if converted:find ("_", 1, true) ~= nil then return nil end
    return converted
end

local function hasIdentifierInSource (source, name)
    return source:find ("%f[%w_]" .. name .. "%f[^%w_]") ~= nil
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

            if name:find ("_", 1, true) ~= nil and name:match ("^[mgs]_[A-Za-z]") == nil and name:match ("^[A-Z0-9_]+$") == nil then
                local line = startRow + 1
                local newName = toCamelCase (name)
                local finding = {
                    line = line,
                    lastLine = line,
                    kind = "underscore in variable `" .. name .. "`",
                    action = "flag",
                }

                if Syntax.isInsideError (node) then
                    finding.reason = "inside a parse-error region"
                elseif document.hasCarriageReturn then
                    finding.reason = "CRLF line endings"
                elseif newName == nil then
                    finding.reason = "leading or trailing underscore; choose a distinct camelCase name"
                elseif hasIdentifierInSource (document.source, newName) then
                    finding.reason = "target name `" .. newName .. "` already exists in file"
                else
                    local edits, reason = Ling.getRenameEdits (document.path, line, startColumn + 1, name, newName)
                    if edits ~= nil then
                        finding.action = "fix"
                        finding.edits = edits
                    else
                        finding.reason = reason .. "; rename `" .. name .. "` to `" .. newName .. "`"
                    end
                end

                table.insert (findings, finding)
            end
        end
    end)

    return findings
end

return Rule
