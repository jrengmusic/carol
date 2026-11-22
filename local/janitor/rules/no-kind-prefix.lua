local Ling = require ("ling")
local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-kind-prefix"
Rule.heading = "NAMES.md Rule 2 **No kind prefix.**"

local query = Syntax.getQuery ([[
(declaration declarator: (identifier) @name)
(declaration declarator: (init_declarator declarator: (identifier) @name))
(declaration declarator: (pointer_declarator declarator: (identifier) @name))
(declaration declarator: (reference_declarator (identifier) @name))
(field_declaration declarator: (field_identifier) @name)
(field_declaration declarator: (pointer_declarator declarator: (field_identifier) @name))
(parameter_declaration declarator: (identifier) @name)
]])

local function getStrippedName (name)
    local afterUnderscore = name:match ("^[mgs]_([A-Za-z][A-Za-z0-9]*)$")
    if afterUnderscore ~= nil then
        return afterUnderscore:sub (1, 1):lower() .. afterUnderscore:sub (2)
    end

    local afterK = name:match ("^k([A-Z][A-Za-z0-9]*)$")
    if afterK ~= nil then
        return afterK:sub (1, 1):lower() .. afterK:sub (2)
    end

    return nil
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
            local newName = getStrippedName (name)

            if newName ~= nil then
                local line = startRow + 1
                local finding = {
                    line = line,
                    lastLine = line,
                    kind = "kind prefix on `" .. name .. "`",
                    action = "flag",
                }

                if Syntax.isInsideError (node) then
                    finding.reason = "inside a parse-error region"
                elseif document.hasCarriageReturn then
                    finding.reason = "CRLF line endings"
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
