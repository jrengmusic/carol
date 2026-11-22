local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-c-math"
Rule.heading = "CODING.md **Math functions:**"

local query = Syntax.getQuery ([[
(call_expression function: (identifier) @fn)
]])

local replacements = {
    fabs = "std::abs",
    fabsf = "std::abs",
    sqrtf = "std::sqrt",
    powf = "std::pow",
    sinf = "std::sin",
    cosf = "std::cos",
    tanf = "std::tan",
    floorf = "std::floor",
    ceilf = "std::ceil",
    roundf = "std::round",
    logf = "std::log",
    expf = "std::exp",
    fmodf = "std::fmod",
    atan2f = "std::atan2",
}

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToCaptures (document, query, function (captureName, node)
        local name = Syntax.getText (document, node)
        local replacement = replacements[name]

        if replacement ~= nil then
            local startRow, startColumn, endRow, endColumn = node:range()
            local line = startRow + 1
            local finding = {
                line = line,
                lastLine = line,
                kind = "C math call `" .. name .. "`",
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
                        text = replacement,
                    },
                }
            end

            table.insert (findings, finding)
        end
    end)

    return findings
end

return Rule
