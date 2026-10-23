local Process = require ("process")
local Xml = require ("xml")

local Xlsx = {}

local unzipExecutable = "unzip"
local workbookPart = "xl/workbook.xml"
local relationshipsPart = "xl/_rels/workbook.xml.rels"
local sharedStringsPart = "xl/sharedStrings.xml"
local packageRoot = "xl/"
local alphabetSize = 26
local firstLetterByte = string.byte ("A")

local function readPart (workbook, part)
    return Process.run (unzipExecutable, { "-p", workbook, part })
end

local function getPartName (target)
    return target:match ("^/(.*)") or (packageRoot .. target)
end

local function getRelationshipTargets (workbook)
    local targetsById = {}

    for attributes in Xml.iterate (readPart (workbook, relationshipsPart), "Relationship") do
        targetsById[Xml.getAttribute (attributes, "Id")] = Xml.getAttribute (attributes, "Target")
    end

    return targetsById
end

function Xlsx.getSheetParts (workbook)
    local targetsById = getRelationshipTargets (workbook)
    local partsByName = {}

    for attributes in Xml.iterate (readPart (workbook, workbookPart), "sheet") do
        local target = targetsById[Xml.getAttribute (attributes, "r:id")]

        partsByName[Xml.getAttribute (attributes, "name")] = getPartName (target)
    end

    return partsByName
end

function Xlsx.getSharedStrings (workbook)
    local partNames = Process.run (unzipExecutable, { "-Z1", workbook })
    local strings = {}

    if partNames:find (sharedStringsPart, 1, true) ~= nil then
        for attributes, body in Xml.iterate (readPart (workbook, sharedStringsPart), "si") do
            table.insert (strings, Xml.getText (body))
        end
    end

    return strings
end

local function getValue (body)
    return body:match ("<v>(.-)</v>") or ""
end

local function getSharedText (body, sharedStrings)
    local text = sharedStrings[tonumber (getValue (body)) + 1]

    assert (text ~= nil, "shared string index out of range: " .. getValue (body))
    return text
end

local function getInlineText (body)
    return Xml.getText (body)
end

local function getPlainText (body)
    return Xml.decode (getValue (body))
end

local textReaders = { s = getSharedText, inlineStr = getInlineText }

local function getColumnNumber (letters)
    local number = 0

    for letter in letters:gmatch (".") do
        number = number * alphabetSize + (letter:byte () - firstLetterByte + 1)
    end

    return number
end

local function addCell (rows, attributes, body, sharedStrings)
    local letters, rowDigits = Xml.getAttribute (attributes, "r"):match ("^([A-Z]+)(%d+)$")
    local readText = textReaders[Xml.getAttribute (attributes, "t")] or getPlainText
    local rowNumber = tonumber (rowDigits)

    rows[rowNumber] = rows[rowNumber] or {}
    rows[rowNumber][getColumnNumber (letters)] = readText (body, sharedStrings)
end

function Xlsx.getRows (workbook, part, sharedStrings)
    local rows = {}

    for attributes, body in Xml.iterate (readPart (workbook, part), "c") do
        addCell (rows, attributes, body, sharedStrings)
    end

    return rows
end

return Xlsx
