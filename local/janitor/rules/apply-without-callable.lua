local Ling = require ("ling")
local Syntax = require ("syntax")

local Rule = {}

Rule.id = "apply-without-callable"
Rule.heading = "NAMES.md Rule 1 — Verb Contract (`apply` takes a callable)"

local query = Syntax.getQuery ([[
(function_declarator declarator: (identifier) @name parameters: (parameter_list) @params)
(function_declarator declarator: (field_identifier) @name parameters: (parameter_list) @params)
(function_declarator declarator: (qualified_identifier name: (identifier) @name) parameters: (parameter_list) @params)
]])

local callablePatterns = {
    "std::function",
    "Function",
    "Callback",
    "Callable",
    "Predicate",
    "Visitor",
    "Fn",
    "Func",
    "Lambda",
    "%(%*%)",
    "%(%*",
}

local function hasCallableText (text)
    if text == nil then return false end
    for index, pattern in ipairs (callablePatterns) do
        if text:find (pattern) ~= nil then return true end
    end
    return false
end

local function isTemplateFunction (node)
    local parent = node:parent()
    while parent ~= nil do
        if parent:type() == "template_declaration" then return true end
        if parent:type() == "class_specifier" or parent:type() == "struct_specifier" or parent:type() == "namespace_definition" then
            return false
        end
        parent = parent:parent()
    end
    return false
end

function Rule.getFindings (document)
    local findings = {}

    Syntax.applyToMatches (document, query, function (captures)
        local name = Syntax.getText (document, captures.name)

        if name:match ("^apply[A-Z]") ~= nil then
            local paramsText = Syntax.getText (document, captures.params)
            local callable = hasCallableText (paramsText)

            if not callable and isTemplateFunction (captures.name) then
                callable = true
            end

            if not callable then
                local startRow, startColumn = captures.name:range()
                local hover = Ling.getHover (document.path, startRow + 1, startColumn + 1)
                if hasCallableText (hover) then
                    callable = true
                end
            end

            if not callable then
                local line, lastLine = Syntax.getLineRange (captures.name)
                table.insert (findings, {
                    line = line,
                    lastLine = lastLine,
                    kind = "`" .. name .. "` has no callable parameter",
                    action = "flag",
                    reason = "use `set...` for writes; reserve `apply...` for functions taking a callable",
                })
            end
        end
    end)

    return findings
end

return Rule
