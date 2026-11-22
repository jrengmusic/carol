local Syntax = require ("syntax")

local Rule = {}

Rule.id = "const-placement"
Rule.heading = "CODING.md **Const placement:**"

local query = Syntax.getQuery ([[
(declaration) @container
(parameter_declaration) @container
(field_declaration) @container
(type_descriptor) @container
]])

local function findEastConst (container, document)
    local typeNode = container:field ("type")[1]
    if typeNode == nil then return nil, nil end

    local typeStartRow, typeStartCol, typeEndRow, typeEndCol = typeNode:range()
    if typeStartRow ~= typeEndRow then return nil, nil end

    local childCount = container:child_count()
    for index = 0, childCount - 1 do
        local child = container:child (index)
        if child:type() == "type_qualifier" and Syntax.getText (document, child) == "const" then
            local qStartRow, qStartCol, qEndRow, qEndCol = child:range()
            if qStartRow == typeEndRow and qStartCol > typeEndCol then
                local lineText = document.lines[typeStartRow + 1]
                local between = lineText:sub (typeEndCol + 1, qStartCol)
                if between:match ("^%s+$") ~= nil then
                    return typeNode, child
                end
            end
        end
    end

    return nil, nil
end

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, container)
        local typeNode, qualNode = findEastConst (container, document)

        if typeNode ~= nil and qualNode ~= nil then
            local startRow, startColumn = typeNode:range()
            local _, _, _, qEndCol = qualNode:range()
            local line = startRow + 1
            local typeText = Syntax.getText (document, typeNode)
            local finding = {
                line = line,
                lastLine = line,
                kind = "east `const` after `" .. typeText .. "`",
                action = "fix",
            }

            if Syntax.isInsideError (container) then
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
                        endColumn = qEndCol,
                        text = "const " .. typeText,
                    },
                }
            end

            table.insert (findings, finding)
        end
    end)

    return findings
end

return Rule
