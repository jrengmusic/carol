-- CODING.md **NO anonymous namespaces allowed:** use static linkage.
-- Fix: remove the namespace wrapper, de-indent its body, and add `static` to each function and variable.
-- Flag: a header, a type, a template, an extern, or an irregular layout.
local Syntax = require ("syntax")

local Rule = {}

Rule.id = "no-anonymous-namespaces-allowed"
Rule.heading = "CODING.md **NO anonymous namespaces allowed:**"

local query = Syntax.getQuery ([[
(namespace_definition !name body: (declaration_list) @body) @namespace
]])

local headerExtensionPattern = "%.h$"
local namespaceKeyword = "namespace"
local openBrace = "{"
local closeBracePattern = "^}%s*//.*$"
local closeBrace = "}"
local staticKeyword = "static"
local staticPrefix = "static "
local fixableTypes = { function_definition = true, declaration = true, comment = true }
local typeSpecifiers = { struct_specifier = true, class_specifier = true, enum_specifier = true, union_specifier = true }
local indentPattern = "^(%s*)"

local function getFlag (line, lastLine, reason)
    return { line = line, lastLine = lastLine, kind = "anonymous namespace", action = "flag", reason = reason }
end

local function getStorageClass (node, document)
    for child in node:iter_children() do
        if child:type() == "storage_class_specifier" then return Syntax.getText (document, child) end
    end

    return nil
end

-- The reason this namespace cannot be fixed mechanically, or nil.
local function getBlockingReason (document, body)
    for child in body:iter_children() do
        if child:named() then
            local childType = child:type()

            if not fixableTypes[childType] then return "holds " .. childType:gsub ("_", " ") end

            if childType == "declaration" then
                local typeNode = child:field ("type")[1]
                if typeNode ~= nil and typeSpecifiers[typeNode:type()] then return "declares a type" end
            end

            local storageClass = getStorageClass (child, document)
            if storageClass ~= nil and storageClass ~= staticKeyword then return "has storage class " .. storageClass end
        end
    end

    return nil
end

local function getCommonIndent (lines, firstLine, lastLine)
    local common = nil

    for line = firstLine, lastLine do
        local text = lines[line]

        if text:match ("%S") then
            local indent = text:match (indentPattern)
            if common == nil or #indent < #common then common = indent end
        end
    end

    return common or ""
end

local function isUniformIndent (lines, firstLine, lastLine, indent)
    for line = firstLine, lastLine do
        local text = lines[line]
        if text:match ("%S") and text:sub (1, #indent) ~= indent then return false end
    end

    return true
end

local function getEdits (document, body, keywordLine, braceLine, closeLine)
    local lines = document.lines
    local indent = getCommonIndent (lines, braceLine + 1, closeLine - 1)
    local staticLines = {}

    for child in body:iter_children() do
        if child:named() and child:type() ~= "comment" and getStorageClass (child, document) == nil then
            local row, column = child:start()
            staticLines[row + 1] = column - #indent
        end
    end

    local edits = {
        { line = keywordLine, isDeleted = true },
        { line = braceLine, isDeleted = true },
        { line = closeLine, isDeleted = true },
    }

    for line = braceLine + 1, closeLine - 1 do
        local text = lines[line]
        local stripped = text:match ("%S") and text:sub (#indent + 1) or text
        local column = staticLines[line]

        if column ~= nil then
            stripped = stripped:sub (1, column) .. staticPrefix .. stripped:sub (column + 1)
        end

        if stripped ~= text then
            table.insert (edits, { line = line, startColumn = 0, endColumn = #text, text = stripped })
        end
    end

    return edits
end

function Rule.getFindings (document)
    local findings = {}
    local lines = document.lines

    Syntax.applyToMatches (document, query, function (captures)
        local keywordLine, closeLine = Syntax.getLineRange (captures.namespace)
        local braceLine = (captures.body:start()) + 1
        local blockingReason = getBlockingReason (document, captures.body)

        if document.path:match (headerExtensionPattern) then
            table.insert (findings, getFlag (keywordLine, closeLine, "in a header; static linkage changes the meaning per TU"))
        elseif Syntax.isInsideError (captures.namespace) then
            table.insert (findings, getFlag (keywordLine, closeLine, "inside a parse-error region"))
        elseif document.hasCarriageReturn then
            table.insert (findings, getFlag (keywordLine, closeLine, "CRLF line endings"))
        elseif blockingReason ~= nil then
            table.insert (findings, getFlag (keywordLine, closeLine, blockingReason))
        elseif lines[keywordLine] ~= namespaceKeyword or braceLine ~= keywordLine + 1 or lines[braceLine] ~= openBrace
            or not (lines[closeLine] == closeBrace or lines[closeLine]:match (closeBracePattern)) then
            table.insert (findings, getFlag (keywordLine, closeLine, "irregular layout: `namespace`, `{`, `}` not alone at column 0"))
        elseif not isUniformIndent (lines, braceLine + 1, closeLine - 1, getCommonIndent (lines, braceLine + 1, closeLine - 1)) then
            table.insert (findings, getFlag (keywordLine, closeLine, "irregular indentation"))
        else
            table.insert (findings, {
                line = keywordLine,
                lastLine = closeLine,
                kind = "anonymous namespace",
                action = "fix",
                edits = getEdits (document, captures.body, keywordLine, braceLine, closeLine),
            })
        end
    end)

    return findings
end

return Rule
