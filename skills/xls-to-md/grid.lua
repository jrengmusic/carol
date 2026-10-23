local Grid = {}

local lineBreakRun = "[\r\n]+"
local lineBreakReplacement = " "
local columnBorder = "-+"
local headerBorder = "=+"

function Grid.normalize (value)
    return vim.trim ((value:gsub (lineBreakRun, lineBreakReplacement)))
end

local function escapeBackslashes (text)
    return (text:gsub ("\\()", function (nextPosition)
        local following = text:sub (nextPosition, nextPosition)

        return (following == "" or following:match ("%p") ~= nil) and "\\\\" or nil
    end))
end

function Grid.escape (text)
    return (escapeBackslashes (text):gsub ("|", "\\|"))
end

local function getRowLine (cells)
    return "|" .. table.concat (cells, "|") .. "|"
end

function Grid.getLines (headers, rows)
    local columnCount = #headers
    local opening = "+" .. string.rep (columnBorder, columnCount)
    local lines = { opening, getRowLine (headers), "+" .. string.rep (headerBorder, columnCount) }

    for rowIndex, cells in ipairs (rows) do
        table.insert (lines, getRowLine (cells))
        table.insert (lines, opening)
    end

    return lines
end

return Grid
