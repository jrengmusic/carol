local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-manual-raii-destructor"
Rule.heading = "CODING.md **Never manually manage RAII objects:**"

local destructorQuery = Syntax.getQuery ([[
(function_definition declarator: (function_declarator declarator: (destructor_name)) body: (compound_statement) @body)
(function_definition declarator: (function_declarator declarator: (qualified_identifier name: (destructor_name))) body: (compound_statement) @body)
]])

local callQuery = Syntax.getQuery ([[
(call_expression function: (field_expression field: (field_identifier) @method)) @call
]])

local assignQuery = Syntax.getQuery ([[
(assignment_expression right: (null) @rhs) @assign
]])

local redundantMethods = {
    reset = true,
    clear = true,
    close = true,
}

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, destructorQuery, function (captureName, body)
        for id, node in callQuery:iter_captures (body, document.source) do
            if callQuery.captures[id] == "method" then
                local name = Syntax.getText (document, node)
                if redundantMethods[name] then
                    local line, lastLine = Syntax.getLineRange (node)
                    table.insert (findings, {
                        line = line,
                        lastLine = lastLine,
                        kind = "manual RAII `." .. name .. "()` in destructor",
                        action = "flag",
                        reason = "RAII objects self-destruct; remove redundant cleanup",
                    })
                end
            end
        end

        for id, node in assignQuery:iter_captures (body, document.source) do
            if assignQuery.captures[id] == "assign" then
                local line, lastLine = Syntax.getLineRange (node)
                table.insert (findings, {
                    line = line,
                    lastLine = lastLine,
                    kind = "manual `= nullptr` in destructor",
                    action = "flag",
                    reason = "RAII objects self-destruct; remove redundant cleanup",
                })
            end
        end
    end)

    return findings
end

return Rule
