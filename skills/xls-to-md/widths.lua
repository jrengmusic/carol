local Widths = {}

local columnOverhead = 3
local tableOverhead = 1
local nonIdentifierRun = "[^A-Za-z0-9]+"
local identifierSeparator = "_"
local leadingDigit = "^%d"
local carriedSpaceWidth = 1

Widths.lineLimit = 100

function Widths.getDisplayWidth (text)
    return vim.api.nvim_strwidth (text)
end

function Widths.getBudget (columnCount)
    return Widths.lineLimit - columnOverhead * columnCount - tableOverhead
end

function Widths.getTotal (widths)
    local total = 0

    for widthIndex, width in ipairs (widths) do
        total = total + width
    end

    return total
end

local function getWidthsAtLevel (headerWidths, naturalWidths, level)
    local widths = {}

    for columnIndex, headerWidth in ipairs (headerWidths) do
        widths[columnIndex] = math.max (headerWidth, math.min (naturalWidths[columnIndex], level))
    end

    return widths
end

function Widths.getTableWidths (headerWidths, naturalWidths)
    local budget = Widths.getBudget (#headerWidths)

    assert (Widths.getTotal (headerWidths) <= budget, "headers exceed the line limit")

    local level = math.max (unpack (naturalWidths))
    local widths = getWidthsAtLevel (headerWidths, naturalWidths, level)

    while Widths.getTotal (widths) > budget do
        level = level - 1
        widths = getWidthsAtLevel (headerWidths, naturalWidths, level)
    end

    return widths
end

function Widths.getColumnId (name)
    local identifier = name:gsub (nonIdentifierRun, identifierSeparator)

    return name:match (leadingDigit) and (identifierSeparator .. identifier) or identifier
end

local function addColumnWidth (entry, width, naturalWidth)
    entry.naturalWidth = math.max (entry.naturalWidth, naturalWidth)

    if width < naturalWidth then
        entry.cappedWidth = math.min (entry.cappedWidth or width, width)
    end
end

local function getEntriesById (tables)
    local ids = {}
    local entriesById = {}

    for tableIndex, sheetTable in ipairs (tables) do
        local widths = Widths.getTableWidths (sheetTable.headerWidths, sheetTable.naturalWidths)

        for columnIndex, name in ipairs (sheetTable.headers) do
            local id = Widths.getColumnId (name)

            if entriesById[id] == nil then
                entriesById[id] = { name = name, naturalWidth = 0 }
                table.insert (ids, id)
            end

            addColumnWidth (entriesById[id], widths[columnIndex], sheetTable.naturalWidths[columnIndex])
        end
    end

    return ids, entriesById
end

function Widths.getStyleLines (tables)
    local ids, entriesById = getEntriesById (tables)
    local lines = { "## format", "", "| name | width |", "| ---- | ----- |" }

    for idIndex, id in ipairs (ids) do
        local entry = entriesById[id]

        local width = entry.cappedWidth and math.max (1, entry.cappedWidth - carriedSpaceWidth) or entry.naturalWidth

        table.insert (lines, "| " .. entry.name .. " | " .. width .. " |")
    end

    return lines
end

return Widths
