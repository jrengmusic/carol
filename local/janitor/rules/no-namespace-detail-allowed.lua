-- CODING.md **NO `namespace detail` (or equivalent implementation-hiding namespaces) allowed:**
-- The correction is a redesign (class private:, static in a .cpp, or PIMPL), so every finding is a flag.
local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-namespace-detail-allowed"
Rule.heading = "CODING.md **NO `namespace detail` (or equivalent implementation-hiding namespaces) allowed:**"

local query = Syntax.getQuery ([[
(namespace_definition name: (_) @name) @namespace
]])

local hidingNames = { detail = true, details = true, impl = true, internal = true }
local scopeSeparator = "::"

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToMatches (document, query, function (captures)
        local name = Syntax.getText (document, captures.name)

        for part in vim.gsplit (name, scopeSeparator, { plain = true }) do
            if hidingNames[part] then
                local line, lastLine = Syntax.getLineRange (captures.namespace)
                table.insert (findings, {
                    line = line,
                    lastLine = lastLine,
                    kind = "`namespace " .. name .. "`",
                    action = "flag",
                    reason = "redesign: class private:, static in a .cpp, or PIMPL",
                })
            end
        end
    end)

    return findings
end

return Rule
