package.path = vim.fn.stdpath ("config") .. "/lua/?.lua;" .. package.path

local Driver = require ("driver")
local markdown = require ("core.markdown-table")

local Epoch = {}

local sampleTableType = "SAMPLE"
local runTableType = "RUN"
local terminateSignal = "sigterm"
local countUnit = "count"
local countType = "int"
local callsPerEpoch = 1

local valueTypes = { int = tonumber, float = tonumber, string = function (text) return text end }
local completeOutcomes = { limit = true, exited = true }

local function getTableRecords (path, heading)
    for tableIndex, parsedTable in ipairs (markdown.getTables (path)) do
        if parsedTable.heading:lower () == heading:lower () then
            return markdown.getRecords (parsedTable)
        end
    end

    return {}
end

local function getTableValues (path, heading)
    local values = {}

    for recordIndex, record in ipairs (getTableRecords (path, heading)) do
        values[record.key] = valueTypes[record.type] (record.value)
    end

    return values
end

local function getSampleKey (frameName)
    return ((frameName:match ("^(.+)%(") or frameName):gsub ("[^A-Za-z0-9:%-]", "-"))
end

local function getManifestSpec (sampleFields, sampleValues, pid)
    local spec = { mode = "attach", pid = pid, cwd = sampleValues.cwd, timeoutMs = sampleValues.timeoutMs }

    for name in pairs (sampleFields) do
        spec[name] = sampleValues[name]
    end

    return spec
end

local function writeSamples (samplesPath, run, targetRunRecords)
    local counts = {}

    for threadIndex, threadId in ipairs (run.threadOrder) do
        for name, count in pairs (run.tallies[threadId].inclusive) do
            local key = getSampleKey (name)

            counts[key] = (counts[key] or 0) + count
        end
    end

    local keys = vim.tbl_keys (counts)
    table.sort (keys)

    local lines = { "## " .. sampleTableType, "", "| key | type | value | calls | unit | bins |", "|---|---|---|---|---|---|" }

    for keyIndex, key in ipairs (keys) do
        table.insert (lines, string.format ("| %s | %s | %d | %d | %s |  |", key, countType, counts[key], callsPerEpoch, countUnit))
    end

    vim.list_extend (lines, { "", "## " .. runTableType, "", "| key | type | value |", "|---|---|---|" })

    for recordIndex, record in ipairs (targetRunRecords) do
        table.insert (lines, string.format ("| %s | %s | %s |", record.key, record.type, record.value))
    end

    local file = assert (io.open (samplesPath, "w"), "cannot open samples file: " .. samplesPath)
    file:write (table.concat (lines, "\n") .. "\n")
    file:close ()
end

function Epoch.main (manifestPath, sampleFields, runSample)
    local sampleValues = getTableValues (manifestPath, sampleTableType)
    local launchSpec = vim.tbl_extend ("error", { mode = "launch" }, sampleValues)
    local errors = Driver.getSpecErrors (launchSpec, sampleFields)
    local exitCode = Driver.exitCodeFailure

    if #errors == 0 then
        local target = vim.system ({ sampleValues.program, manifestPath })
        local isCompleted, run = pcall (runSample, getManifestSpec (sampleFields, sampleValues, target.pid))
        local samplesPath = vim.fs.joinpath (vim.fs.dirname (manifestPath), getTableValues (manifestPath, runTableType).samples)

        if isCompleted then
            target:wait ()

            if vim.uv.fs_stat (samplesPath) ~= nil then
                writeSamples (samplesPath, run, getTableRecords (samplesPath, runTableType))
                exitCode = completeOutcomes[run.outcome] and 0 or Driver.exitCodeFailure
            else
                Driver.report ("DRIVER ERROR not found: " .. samplesPath)
            end
        else
            Driver.report ("DRIVER ERROR " .. Driver.oneLine (run))
            target:kill (terminateSignal)
            target:wait ()
        end
    else
        exitCode = Driver.exitCodeSpecError
        Driver.reportSpecErrors (errors)
    end

    return exitCode
end

return Epoch
