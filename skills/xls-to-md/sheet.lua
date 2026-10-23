local Grid = require ("grid")
local Widths = require ("widths")

local Sheet = {}

local headerRowNumber = 1
local missingProblem = 'header "%s" not in row 1'
local ambiguousProblem = 'header "%s" occurs more than once in row 1'
local problemsByCount = { [0] = missingProblem, [2] = ambiguousProblem }
local ambiguousCount = 2

local function getNumbersByHeader (headerRow)
    local numbersByHeader = {}

    for columnNumber, header in pairs (headerRow) do
        local text = Grid.normalize (header)

        numbersByHeader[text] = numbersByHeader[text] or {}
        table.insert (numbersByHeader[text], columnNumber)
    end

    return numbersByHeader
end

local function findColumnNumbers (rows, columns, label)
    local numbersByHeader = getNumbersByHeader (rows[headerRowNumber] or {})
    local columnNumbers = {}
    local errors = {}

    for columnIndex, column in ipairs (columns) do
        local header = Grid.normalize (column)
        local numbers = numbersByHeader[header] or {}
        local problem = problemsByCount[math.min (#numbers, ambiguousCount)]

        columnNumbers[columnIndex] = numbers[1]

        if problem ~= nil then
            table.insert (errors, label .. ".columns[" .. columnIndex .. "]: " .. problem:format (header))
        end
    end

    return columnNumbers, errors
end

local function getCells (row, columnNumbers)
    local cells = {}
    local hasText = false

    for columnIndex, columnNumber in ipairs (columnNumbers) do
        local text = Grid.normalize (row[columnNumber] or "")

        cells[columnIndex] = Grid.escape (text)
        hasText = hasText or text ~= ""
    end

    return cells, hasText
end

local function getBodyRows (rows, columnNumbers)
    local rowNumbers = vim.tbl_keys (rows)
    local bodyRows = {}

    table.sort (rowNumbers)

    for rowIndex, rowNumber in ipairs (rowNumbers) do
        local cells, hasText = getCells (rows[rowNumber], columnNumbers)

        if rowNumber > headerRowNumber and hasText then
            table.insert (bodyRows, cells)
        end
    end

    return bodyRows
end

local function getNaturalWidths (headerWidths, bodyRows)
    local widths = vim.deepcopy (headerWidths)

    for rowIndex, cells in ipairs (bodyRows) do
        for columnIndex, cell in ipairs (cells) do
            widths[columnIndex] = math.max (widths[columnIndex], Widths.getDisplayWidth (cell))
        end
    end

    return widths
end

local function getHeaderErrors (headerWidths, label)
    local needed = Widths.getTotal (headerWidths)
    local budget = Widths.getBudget (#headerWidths)
    local errors = {}

    if needed > budget then
        table.insert (errors, label .. ".columns: headers need " .. needed .. " columns, limit is " .. budget)
    end

    return errors
end

local function buildTable (rows, columns, columnNumbers, label)
    local headers = {}
    local headerWidths = {}

    for columnIndex, column in ipairs (columns) do
        headers[columnIndex] = Grid.escape (Grid.normalize (column))
        headerWidths[columnIndex] = Widths.getDisplayWidth (headers[columnIndex])
    end

    local errors = getHeaderErrors (headerWidths, label)
    local sheetTable = nil

    if #errors == 0 then
        local bodyRows = getBodyRows (rows, columnNumbers)

        sheetTable = {
            headers = headers,
            rows = bodyRows,
            headerWidths = headerWidths,
            naturalWidths = getNaturalWidths (headerWidths, bodyRows),
        }
    end

    return sheetTable, errors
end

function Sheet.getTable (rows, columns, label)
    local columnNumbers, errors = findColumnNumbers (rows, columns, label)
    local sheetTable = nil

    if #errors == 0 then
        sheetTable, errors = buildTable (rows, columns, columnNumbers, label)
    end

    return sheetTable, errors
end

return Sheet
