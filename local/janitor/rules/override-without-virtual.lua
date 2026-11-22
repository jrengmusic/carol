local Syntax = require ("syntax")

local Rule = {}

Rule.id = "override-without-virtual"
Rule.heading = "CODING.md ## OVERRIDE AND VIRTUAL"

local query = Syntax.getQuery ([[
(field_declaration) @member
(function_definition) @member
]])

local function findVirtualAndOverride (node, document)
    local virtualNode = nil
    local hasOverride = false

    local function scan (current)
        local nodeType = current:type()
        if nodeType == "virtual" then
            virtualNode = current
        elseif nodeType == "virtual_specifier" and Syntax.getText (document, current) == "override" then
            hasOverride = true
        end

        if nodeType ~= "compound_statement" and nodeType ~= "field_declaration_list" then
            local childCount = current:child_count()
            for index = 0, childCount - 1 do
                scan (current:child (index))
            end
        end
    end

    scan (node)
    return virtualNode, hasOverride
end

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        local virtualNode, hasOverride = findVirtualAndOverride (node, document)

        if virtualNode ~= nil and hasOverride then
            local startRow, startColumn, endRow, endColumn = virtualNode:range()
            local line = startRow + 1
            local lineText = document.lines[line]
            local removeEnd = endColumn
            if lineText:sub (removeEnd + 1, removeEnd + 1) == " " then
                removeEnd = removeEnd + 1
            end

            local finding = {
                line = line,
                lastLine = line,
                kind = "redundant `virtual` with `override`",
                action = "fix",
            }

            if Syntax.isInsideError (node) then
                finding.action = "flag"
                finding.reason = "inside a parse-error region"
            elseif document.hasCarriageReturn then
                finding.action = "flag"
                finding.reason = "CRLF line endings"
            else
                finding.edits = {
                    {
                        line = line,
                        startColumn = startColumn,
                        endColumn = removeEnd,
                        text = "",
                    },
                }
            end

            table.insert (findings, finding)
        end
    end)

    return findings
end

return Rule
