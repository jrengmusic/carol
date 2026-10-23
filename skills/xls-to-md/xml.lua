local Xml = {}

local namedReferences = { lt = "<", gt = ">", amp = "&", quot = '"', apos = "'" }

local numericReferences = {
    { pattern = "^#x(%x+)$", base = 16 },
    { pattern = "^#(%d+)$", base = 10 },
}

local function getReferenceCharacter (name)
    local character = namedReferences[name]

    for patternIndex, numeric in ipairs (numericReferences) do
        local digits = name:match (numeric.pattern)

        if character == nil and digits ~= nil then
            character = vim.fn.nr2char (tonumber (digits, numeric.base))
        end
    end

    assert (character ~= nil, "unknown XML reference: &" .. name .. ";")
    return character
end

function Xml.decode (text)
    return (text:gsub ("&([#%w]+);", getReferenceCharacter))
end

function Xml.getAttribute (attributes, name)
    local value = attributes:match ("%s" .. name .. '="([^"]*)"')

    return value and Xml.decode (value)
end

function Xml.getText (fragment)
    local runs = {}
    local plain = fragment:gsub ("<rPh[%s>].-</rPh>", ""):gsub ("<t%s[^>]*>", "<t>")

    for run in plain:gmatch ("<t>(.-)</t>") do
        table.insert (runs, Xml.decode (run))
    end

    return table.concat (runs)
end

local function getElementAt (xml, tagStart, name)
    local openingLength = #name + 1
    local tagEnd = xml:find (">", tagStart, true)
    local attributes = xml:sub (tagStart + openingLength, tagEnd - 1)
    local body = ""
    local nextCursor = tagEnd + 1

    if attributes:sub (-1) ~= "/" then
        local closing = "</" .. name .. ">"
        local closingStart = xml:find (closing, nextCursor, true)

        body = xml:sub (nextCursor, closingStart - 1)
        nextCursor = closingStart + #closing
    end

    return attributes, body, nextCursor
end

function Xml.iterate (xml, name)
    local cursor = 1
    local opening = "<" .. name .. "[%s>/]"

    return function ()
        local tagStart = xml:find (opening, cursor)
        local attributes = nil
        local body = nil

        if tagStart ~= nil then
            attributes, body, cursor = getElementAt (xml, tagStart, name)
        end

        return attributes, body
    end
end

return Xml
