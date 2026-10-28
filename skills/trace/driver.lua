local Dap = require ("dap")

local Driver = {}

local whatdbgExecutable = "whatdbg"
Driver.exitCodeSpecError = 2
Driver.exitCodeFailure = 1
local terminateTimeoutMs = 5000
local newlineEscape = "\\n"
local noSourceLabel = "<no source>"

local modes = { launch = true, attach = true }

Driver.count = {
    type = "value",
    expects = "positive integer",
    check = function (value) return type (value) == "number" and value >= 1 and value == math.floor (value) end,
}

Driver.text = {
    type = "value",
    expects = "string",
    check = function (value) return type (value) == "string" end,
}

Driver.flag = {
    type = "value",
    expects = "boolean",
    check = function (value) return type (value) == "boolean" end,
}

local sessionFields = {
    mode = {
        type = "value",
        expects = "launch or attach",
        check = function (value) return modes[value] ~= nil end,
    },
    cwd = Driver.text,
    timeoutMs = Driver.count,
}

local fieldsByMode = {
    launch = { program = Driver.text },
    attach = { pid = Driver.count },
}

local argumentsByMode = {
    launch = function (spec) return { program = spec.program, cwd = spec.cwd } end,
    attach = function (spec) return { pid = spec.pid, cwd = spec.cwd } end,
}

local terminationRequired = { exited = false, crash = true, limit = true, timeout = true, error = true }

function Driver.report (line)
    io.stdout:write (line .. "\n")
end

function Driver.oneLine (value)
    return (tostring (value):gsub ("\r?\n", newlineEscape))
end

Driver.getNowMs = Dap.getNowMs

local function getSortedKeys (map)
    local keys = vim.tbl_keys (map)
    table.sort (keys)
    return keys
end

local validators = {}

local function validate (value, schema, label, errors)
    validators[schema.type] (value, schema, label, errors)
end

function validators.value (value, schema, label, errors)
    if not schema.check (value) then
        table.insert (errors, label .. ": expected " .. schema.expects)
    end
end

function validators.list (value, schema, label, errors)
    if type (value) == "table" and vim.islist (value) then
        for itemIndex, item in ipairs (value) do
            validate (item, schema.item, label .. "[" .. itemIndex .. "]", errors)
        end
    else
        table.insert (errors, label .. ": expected list")
    end
end

function validators.object (value, schema, label, errors)
    if type (value) == "table" then
        for nameIndex, name in ipairs (getSortedKeys (schema.fields)) do
            if value[name] == nil then
                table.insert (errors, label .. "." .. name .. ": missing, expected " .. schema.fields[name].expects)
            else
                validate (value[name], schema.fields[name], label .. "." .. name, errors)
            end
        end

        for nameIndex, name in ipairs (getSortedKeys (value)) do
            if schema.fields[name] == nil then
                table.insert (errors, label .. "." .. name .. ": unknown field")
            end
        end
    else
        table.insert (errors, label .. ": expected object")
    end
end

function Driver.getSpecErrors (spec, driverFields)
    local errors = {}
    local modeFields = type (spec) == "table" and fieldsByMode[spec.mode] or {}
    local schema = { type = "object", fields = vim.tbl_extend ("error", sessionFields, modeFields, driverFields) }

    validate (spec, schema, "spec", errors)
    return errors
end

local function readSpec (path)
    local file = assert (io.open (path, "r"), "cannot open spec file: " .. path)
    local content = file:read ("*a")
    file:close ()
    return pcall (vim.json.decode, content)
end

function Driver.requestChecked (client, command, arguments)
    local response = client:request (command, arguments)
    assert (response.success, command .. " failed: " .. tostring (response.message))
    return response
end

function Driver.getFrameLabel (frame)
    local location = noSourceLabel

    if frame.source ~= nil then
        location = frame.source.path .. ":" .. tostring (frame.line)
    end

    return frame.name .. " " .. location
end

function Driver.spawnClient ()
    local whatdbgPath = vim.fn.exepath (whatdbgExecutable)
    assert (whatdbgPath ~= "", whatdbgExecutable .. " not found on PATH")

    return Dap.spawn ({ whatdbgPath })
end

function Driver.initializeSession (client, spec, adapterId)
    Driver.requestChecked (client, "initialize", { adapterID = adapterId })
    Driver.requestChecked (client, spec.mode, argumentsByMode[spec.mode] (spec))
end

local disconnectsByMode = {
    launch = function (client)
        client:send ("disconnect", { terminateDebuggee = true })
        client:waitForEvent ("terminated", terminateTimeoutMs)
    end,
    attach = function (client)
        client:request ("disconnect", { terminateDebuggee = false })
    end,
}

function Driver.endSession (client, spec, outcome)
    if terminationRequired[outcome] then
        disconnectsByMode[spec.mode] (client)
    end

    client:close ()
end

local function onOutput (run, body)
    Driver.report ("OUTPUT " .. tostring (body.category) .. " " .. Driver.oneLine (body.output))
end

local function onProcess (run, body)
    Driver.report ("PROCESS name=" .. tostring (body.name) .. " pid=" .. tostring (body.systemProcessId))
end

local function onExited (run, body)
    Driver.report ("EXITED code=" .. tostring (body.exitCode))
    return "exited"
end

Driver.events = {
    output = onOutput,
    process = onProcess,
    exited = onExited,
}

function Driver.reportSpecErrors (errors)
    for errorIndex, message in ipairs (errors) do
        Driver.report ("SPEC ERROR " .. message)
    end
end

function Driver.main (specPath, driverFields, runSpec)
    local isDecoded, spec = readSpec (specPath)
    local errors = isDecoded and Driver.getSpecErrors (spec, driverFields) or { "spec: invalid JSON: " .. Driver.oneLine (spec) }
    local exitCode = Driver.exitCodeSpecError

    if #errors == 0 then
        runSpec (spec)
        exitCode = 0
    else
        Driver.reportSpecErrors (errors)
    end

    return exitCode
end

return Driver
