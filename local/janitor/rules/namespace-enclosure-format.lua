-- CODING.md **Namespace enclosure format:** 80-column open banner after `{`,
-- 80-column close banner before `}`, and `}// namespace <name>`.
local Syntax = require ("syntax")

local Rule = {}

Rule.id = "namespace-enclosure-format"
Rule.heading = "CODING.md **Namespace enclosure format:**"

local query = Syntax.getQuery ([[
(namespace_definition name: (_) @name body: (declaration_list) @body) @namespace
]])

local openBanner = "/*____________________________________________________________________________*/"
local closeBanner = "/**_____________________________END OF NAMESPACE______________________________*/"
local openBannerLikePattern = "^/%*_+%*/$"
local closeBannerLikePattern = "^/%*%*_+END OF NAMESPACE_+%*/$"
local closingCommentPatterns = {
    "^%s*//%s*namespace[%w%s_:]*$",
    "^%s*/%*%*?%s*namespace[%w%s_:]*%*/%s*$",
}
local openBrace = "{"
local closeBrace = "}"
local closingCommentPrefix = "// namespace "

local function getFlag (line, kind, reason)
    return { line = line, lastLine = line, kind = kind, action = "flag", reason = reason }
end

local function getFix (line, kind, edit)
    return { line = line, lastLine = line, kind = kind, action = "fix", edits = { edit } }
end

-- `{ /*____*/`: the banner shares the `{` line. The banner always takes its own line.
local function isBannerOnBraceLine (text)
    local rest = vim.trim (text:sub (#openBrace + 1))
    return text:sub (1, #openBrace) == openBrace and rest:match (openBannerLikePattern) ~= nil
end

local function addOpenFindings (findings, lines, braceLine, closeLine)
    local nextText = lines[braceLine + 1]
    local hasBodyLine = braceLine + 1 < closeLine

    if hasBodyLine and nextText:match (openBannerLikePattern) and nextText ~= openBanner then
        table.insert (findings, getFix (braceLine + 1, "wrong open banner",
            { line = braceLine + 1, startColumn = 0, endColumn = #nextText, text = openBanner }))
    elseif not (hasBodyLine and nextText == openBanner) then
        table.insert (findings, getFix (braceLine, "missing open banner",
            { line = braceLine, startColumn = #lines[braceLine], endColumn = #lines[braceLine], text = "\n" .. openBanner }))
    end
end

local function addCloseBannerFindings (findings, lines, braceLine, closeLine)
    local previousText = lines[closeLine - 1]
    local hasBodyLine = closeLine - 1 > braceLine

    if hasBodyLine and previousText:match (closeBannerLikePattern) and previousText ~= closeBanner then
        table.insert (findings, getFix (closeLine - 1, "wrong close banner",
            { line = closeLine - 1, startColumn = 0, endColumn = #previousText, text = closeBanner }))
    elseif not (hasBodyLine and previousText == closeBanner) then
        table.insert (findings, getFix (closeLine, "missing close banner",
            { line = closeLine, startColumn = 0, endColumn = 0, text = closeBanner .. "\n" }))
    end
end

local function addClosingCommentFindings (findings, lines, closeLine, name)
    local closeText = lines[closeLine]
    local expected = closeBrace .. closingCommentPrefix .. name
    local rest = closeText:sub (2)
    local isClosingComment = rest == "" or vim.iter (closingCommentPatterns):any (function (pattern) return rest:match (pattern) ~= nil end)

    if closeText ~= expected and isClosingComment then
        table.insert (findings, getFix (closeLine, "wrong closing comment",
            { line = closeLine, startColumn = 1, endColumn = #closeText, text = closingCommentPrefix .. name }))
    elseif closeText ~= expected then
        table.insert (findings, getFlag (closeLine, "code after closing brace", "the `}` line holds code; a fix would move code"))
    end
end

function Rule.getFindings (document)
    local findings = {}
    local lines = document.lines

    Syntax.applyToMatches (document, query, function (captures)
        local name = Syntax.getText (document, captures.name)
        local startRow, startColumn = captures.body:start()
        local endRow, endColumn = captures.body:end_()
        local braceLine = startRow + 1
        local closeLine = endRow + 1

        if Syntax.isInsideError (captures.namespace) then
            table.insert (findings, getFlag (braceLine, "namespace in a parse-error region", "the parse tree is not reliable here"))
        elseif document.hasCarriageReturn then
            table.insert (findings, getFlag (braceLine, "namespace enclosure", "CRLF line endings"))
        elseif lines[braceLine] ~= openBrace and isBannerOnBraceLine (lines[braceLine]) then
            table.insert (findings, getFix (braceLine, "open banner on the brace line",
                { line = braceLine, startColumn = 0, endColumn = #lines[braceLine], text = openBrace .. "\n" .. openBanner }))
            addCloseBannerFindings (findings, lines, braceLine, closeLine)
            addClosingCommentFindings (findings, lines, closeLine, name)
        elseif lines[braceLine] ~= openBrace then
            table.insert (findings, getFlag (braceLine, "brace placement", "`{` is not alone at column 0"))
        elseif endColumn ~= 1 then
            table.insert (findings, getFlag (closeLine, "closing brace placement", "`}` is not at column 0"))
        else
            addOpenFindings (findings, lines, braceLine, closeLine)
            addCloseBannerFindings (findings, lines, braceLine, closeLine)
            addClosingCommentFindings (findings, lines, closeLine, name)
        end
    end)

    return findings
end

return Rule
