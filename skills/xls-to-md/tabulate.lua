local scriptDirectory = vim.fn.fnamemodify (arg[0], ":h")
package.path = scriptDirectory .. "/?.lua;" .. package.path

local Grid = require ("grid")
local Process = require ("process")
local Sheet = require ("sheet")
local Spec = require ("spec")
local Widths = require ("widths")
local Xlsx = require ("xlsx")

local exitCodeSuccess = 0
local exitCodeDriverError = 1
local exitCodeSpecError = 2
local castExecutable = "cast"
local styleFileName = ".cast-format"
local newlineEscape = "\\n"

local function report (line)
    io.stdout:write (line .. "\n")
end

local function oneLine (value)
    return (tostring (value):gsub ("\r?\n", newlineEscape))
end

local function getTables (spec)
    local sheetParts = Xlsx.getSheetParts (spec.workbook)
    local sharedStrings = Xlsx.getSharedStrings (spec.workbook)
    local tables = {}
    local errors = {}

    for sheetIndex, sheetSpec in ipairs (spec.sheets) do
        local label = "spec.sheets[" .. sheetIndex .. "]"
        local part = sheetParts[sheetSpec.name]

        if part == nil then
            table.insert (errors, label .. '.name: sheet "' .. sheetSpec.name .. '" not in workbook')
        else
            local rows = Xlsx.getRows (spec.workbook, part, sharedStrings)
            local sheetTable, sheetErrors = Sheet.getTable (rows, sheetSpec.columns, label)

            vim.list_extend (errors, sheetErrors)

            if sheetTable ~= nil then
                sheetTable.name = sheetSpec.name
                table.insert (tables, sheetTable)
            end
        end
    end

    return tables, errors
end

local function getMarkdownLines (tables)
    local lines = {}

    for tableIndex, sheetTable in ipairs (tables) do
        if tableIndex > 1 then
            table.insert (lines, "")
        end

        table.insert (lines, "## " .. sheetTable.name)
        table.insert (lines, "")
        vim.list_extend (lines, Grid.getLines (sheetTable.headers, sheetTable.rows))
    end

    return lines
end

local function writeLines (path, lines)
    local file = assert (io.open (path, "wb"), "cannot write " .. path)

    file:write (table.concat (lines, "\n") .. "\n")
    file:close ()
end

local function addOverlongLine (overlong, lineNumber, width)
    local lastRun = overlong[#overlong]

    if lastRun ~= nil and lastRun.width == width and lastRun.last == lineNumber - 1 then
        lastRun.last = lineNumber
    else
        table.insert (overlong, { first = lineNumber, last = lineNumber, width = width })
    end
end

local function getOverlongText (overlong)
    local runs = {}

    for runIndex, run in ipairs (overlong) do
        local lines = run.first == run.last and tostring (run.first) or (run.first .. "-" .. run.last)

        table.insert (runs, lines .. "=" .. run.width)
    end

    return table.concat (runs, " ")
end

local function checkWidths (path)
    local overlong = {}
    local lineNumber = 0

    for line in io.lines (path) do
        local width = Widths.getDisplayWidth (line)

        lineNumber = lineNumber + 1

        if width > Widths.lineLimit then
            addOverlongLine (overlong, lineNumber, width)
        end
    end

    assert (#overlong == 0, "lines over " .. Widths.lineLimit .. " columns (line=width): " .. getOverlongText (overlong))
end

local function run (spec)
    local tables, errors = getTables (spec)

    if #errors == 0 then
        local stylePath = vim.fs.joinpath (vim.fs.dirname (spec.output), styleFileName)

        writeLines (spec.output, getMarkdownLines (tables))
        writeLines (stylePath, Widths.getStyleLines (tables))
        Process.run (castExecutable, { "--format", "-i", "--style=file:" .. stylePath, spec.output })
        checkWidths (spec.output)
    end

    return errors
end

local function main (specPath)
    local spec, errors = Spec.read (specPath)
    local exitCode = exitCodeSpecError

    if #errors == 0 then
        local isCompleted, result = pcall (run, spec)

        errors = isCompleted and result or {}
        exitCode = isCompleted and exitCodeSuccess or exitCodeDriverError

        if not isCompleted then
            report ("DRIVER ERROR " .. oneLine (result))
        end
    end

    for errorIndex, message in ipairs (errors) do
        report ("SPEC ERROR " .. message)
        exitCode = exitCodeSpecError
    end

    return exitCode
end

assert (arg[1] ~= nil, "usage: nvim --headless -l tabulate.lua <spec-path>")
os.exit (main (arg[1]))
