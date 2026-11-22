local Syntax = require ("syntax")

local Rule = {}

Rule.id = "numeric-literals"
Rule.heading = "CODING.md **Numeric literals:**"

local query = Syntax.getQuery ([[
(number_literal) @literal
]])

local function getFixedLiteral (text)
    if text:match ("^0[xX]") ~= nil then
        local body = text:sub (3)
        local hexPart, suffix = body:match ("^([0-9a-fA-F']+)(.*)$")
        if hexPart ~= nil then
            local fixed = "0x" .. hexPart:lower() .. suffix
            if fixed ~= text then
                return fixed, "uppercase hex literal `" .. text .. "`"
            end
        end
        return nil, nil
    end

    local leading = text:match ("^%.(%d+[fFlL]?)$")
    if leading ~= nil then
        return "0." .. leading, "leading-dot float literal `" .. text .. "`"
    end

    local digits, suffix = text:match ("^(%d+)%.([fFlL]?)$")
    if digits ~= nil then
        return digits .. ".0" .. suffix, "trailing-dot float literal `" .. text .. "`"
    end

    return nil, nil
end

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        local text = Syntax.getText (document, node)
        local fixed, kind = getFixedLiteral (text)

        if fixed ~= nil then
            local startRow, startColumn, endRow, endColumn = node:range()
            local line = startRow + 1
            local finding = {
                line = line,
                lastLine = line,
                kind = kind,
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
                        endColumn = endColumn,
                        text = fixed,
                    },
                }
            end

            table.insert (findings, finding)
        end
    end)

    return findings
end

return Rule
