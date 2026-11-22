local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-forward-declarations"
Rule.heading = "CODING.md ### No Forward Declarations"

local query = Syntax.getQuery ([[
(class_specifier name: (type_identifier) @name) @spec
(struct_specifier name: (type_identifier) @name) @spec
]])

local standaloneParents = {
    translation_unit = true,
    declaration_list = true,
    field_declaration_list = true,
}

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToMatches (document, query, function (captures)
        local spec = captures.spec
        local parent = spec:parent()

        if spec:field ("body")[1] == nil and parent ~= nil and standaloneParents[parent:type()] then
            local line, lastLine = Syntax.getLineRange (spec)
            local name = Syntax.getText (document, captures.name)
            table.insert (findings, {
                line = line,
                lastLine = lastLine,
                kind = "forward declaration of `" .. name .. "`",
                action = "flag",
                reason = "include the header defining `" .. name .. "` instead",
            })
        end
    end)

    return findings
end

return Rule
