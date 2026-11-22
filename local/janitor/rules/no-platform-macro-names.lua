local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-platform-macro-names"
Rule.heading = "CODING.md ### Platform macro names"

local query = Syntax.getQuery ([[
(declaration declarator: (identifier) @name)
(declaration declarator: (init_declarator declarator: (identifier) @name))
(field_declaration declarator: (field_identifier) @name)
(parameter_declaration declarator: (identifier) @name)
(function_declarator declarator: (identifier) @name)
(function_declarator declarator: (field_identifier) @name)
(enumerator name: (identifier) @name)
]])

local platformMacros = {
    pascal = "minwindef.h",
    cdecl = "minwindef.h",
    near = "minwindef.h",
    far = "minwindef.h",
    NEAR = "minwindef.h",
    FAR = "minwindef.h",
    IN = "minwindef.h",
    OUT = "minwindef.h",
    OPTIONAL = "minwindef.h",
    CALLBACK = "minwindef.h",
    min = "minwindef.h",
    max = "minwindef.h",
    small = "rpcndr.h",
    interface = "combaseapi.h",
    ERROR = "wingdi.h",
    DELETE = "winnt.h",
}

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        local name = Syntax.getText (document, node)
        local header = platformMacros[name]

        if header ~= nil then
            local line, lastLine = Syntax.getLineRange (node)
            table.insert (findings, {
                line = line,
                lastLine = lastLine,
                kind = "Windows SDK macro name `" .. name .. "`",
                action = "flag",
                reason = "conflicts with Windows SDK macro in " .. header .. "; choose a semantic name",
            })
        end
    end)

    return findings
end

return Rule
