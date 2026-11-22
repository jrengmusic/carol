local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-multiple-pointers"
Rule.heading = "CODING.md **Multiple pointers:**"

local query = Syntax.getQuery ([[
(declaration) @decl
(field_declaration) @decl
]])

local function hasPointerDeclarator (node)
    if node:type() == "pointer_declarator" then return true end
    local childCount = node:child_count()
    for index = 0, childCount - 1 do
        if hasPointerDeclarator (node:child (index)) then return true end
    end
    return false
end

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        local declarators = node:field ("declarator")

        if #declarators > 1 then
            local hasPointer = false
            for index, declarator in ipairs (declarators) do
                if hasPointerDeclarator (declarator) then
                    hasPointer = true
                    break
                end
            end

            if hasPointer then
                local line, lastLine = Syntax.getLineRange (node)
                table.insert (findings, {
                    line = line,
                    lastLine = lastLine,
                    kind = "multiple pointer declarators in one statement",
                    action = "flag",
                    reason = "split into one pointer declaration per line",
                })
            end
        end
    end)

    return findings
end

return Rule
