local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-local-struct"
Rule.heading = "CODING.md ### No local struct definitions inside function bodies"

local query = Syntax.getQuery ([[
(struct_specifier body: (field_declaration_list)) @type
(class_specifier body: (field_declaration_list)) @type
]])

local function isInsideFunctionBody (node)
    local parent = node:parent()

    while parent ~= nil do
        if parent:type() == "compound_statement" then return true end
        parent = parent:parent()
    end

    return false
end

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        if isInsideFunctionBody (node) then
            local line, lastLine = Syntax.getLineRange (node)
            local keyword = node:type() == "struct_specifier" and "struct" or "class"
            table.insert (findings, {
                line = line,
                lastLine = lastLine,
                kind = "local `" .. keyword .. "` definition inside function body",
                action = "flag",
                reason = "move type definition to class scope, file scope, or header",
            })
        end
    end)

    return findings
end

return Rule
