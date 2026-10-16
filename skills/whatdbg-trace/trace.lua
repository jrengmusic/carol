local scriptDirectory = vim.fn.fnamemodify (arg[0], ":h")
package.path = scriptDirectory .. "/?.lua;" .. package.path

local Dap = require ("dap")

local adapterId = "whatdbg-trace"
local whatdbgExecutable = "whatdbg"
local exitCodeSpecError = 2
local terminateTimeoutMs = 5000
local nanosecondsPerMillisecond = 1000000
local newlineEscape = "\\n"
local noSourceLabel = "<no source>"

local modes = { launch = true, attach = true }
local afterStopActions = { continue = true, next = true, stepIn = true, stepOut = true }

local count = {
    kind = "value",
    expects = "positive integer",
    check = function (value) return type (value) == "number" and value >= 1 and value == math.floor (value) end,
}

local text = {
    kind = "value",
    expects = "string",
    check = function (value) return type (value) == "string" end,
}

local flag = {
    kind = "value",
    expects = "boolean",
    check = function (value) return type (value) == "boolean" end,
}

local commonFields = {
    mode = {
        kind = "value",
        expects = "launch or attach",
        check = function (value) return modes[value] ~= nil end,
    },
    cwd = text,
    breakpoints = {
        kind = "list",
        expects = "list",
        item = { kind = "object", expects = "object", fields = { file = text, line = count } },
    },
    onStop = {
        kind = "object",
        expects = "object",
        fields = {
            stackDepth = count,
            locals = flag,
            expressions = { kind = "list", expects = "list", item = text },
        },
    },
    afterStop = {
        kind = "value",
        expects = "continue, next, stepIn or stepOut",
        check = function (value) return afterStopActions[value] ~= nil end,
    },
    maxStops = count,
    timeoutMs = count,
}

local fieldsByMode = {
    launch = { program = text },
    attach = { pid = count },
}

local argumentsByMode = {
    launch = function (spec) return { program = spec.program, cwd = spec.cwd } end,
    attach = function (spec) return { pid = spec.pid, cwd = spec.cwd } end,
}

local stopOutcomeByReason = { exception = "crash" }

local terminationRequired = { exited = false, crash = true, limit = true, timeout = true, error = true }

local function report (line)
    io.stdout:write (line .. "\n")
end

local function oneLine (value)
    return (tostring (value):gsub ("\r?\n", newlineEscape))
end

local function getNowMs ()
    return vim.uv.hrtime () / nanosecondsPerMillisecond
end

local function getSortedKeys (map)
    local keys = vim.tbl_keys (map)
    table.sort (keys)
    return keys
end

local validators = {}

local function validate (value, schema, label, errors)
    validators[schema.kind] (value, schema, label, errors)
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

local function getSpecErrors (spec)
    local errors = {}
    local modeFields = type (spec) == "table" and fieldsByMode[spec.mode] or {}
    local schema = { kind = "object", fields = vim.tbl_extend ("error", commonFields, modeFields) }

    validate (spec, schema, "spec", errors)
    return errors
end

local function readSpec (path)
    local file = assert (io.open (path, "r"), "cannot open spec file: " .. path)
    local content = file:read ("*a")
    file:close ()
    return pcall (vim.json.decode, content)
end

local function requestChecked (client, command, arguments)
    local response = client:request (command, arguments)
    assert (response.success, command .. " failed: " .. tostring (response.message))
    return response
end

local function getFrameLabel (frame)
    local location = noSourceLabel

    if frame.source ~= nil then
        location = frame.source.path .. ":" .. tostring (frame.line)
    end

    return frame.name .. " " .. location
end

local function getBreakpointsByFile (breakpoints)
    local files = {}
    local linesByFile = {}

    for breakpointIndex, breakpoint in ipairs (breakpoints) do
        if linesByFile[breakpoint.file] == nil then
            linesByFile[breakpoint.file] = {}
            table.insert (files, breakpoint.file)
        end

        table.insert (linesByFile[breakpoint.file], breakpoint.line)
    end

    return files, linesByFile
end

local function reportBreakpoint (file, requestedLine, result)
    local message = result.message and (" message=" .. oneLine (result.message)) or ""

    report ("BREAKPOINT " .. file .. ":" .. requestedLine
        .. " verified=" .. tostring (result.verified)
        .. " line=" .. tostring (result.line) .. message)
end

local function setBreakpoints (client, breakpoints)
    local files, linesByFile = getBreakpointsByFile (breakpoints)

    for fileIndex, file in ipairs (files) do
        local requested = {}

        for lineIndex, line in ipairs (linesByFile[file]) do
            table.insert (requested, { line = line })
        end

        local response = requestChecked (client, "setBreakpoints", { source = { path = file }, breakpoints = requested })

        for resultIndex, result in ipairs (response.body.breakpoints) do
            reportBreakpoint (file, linesByFile[file][resultIndex], result)
        end
    end
end

local function openSession (client, spec)
    requestChecked (client, "initialize", { adapterID = adapterId })
    requestChecked (client, spec.mode, argumentsByMode[spec.mode] (spec))
    setBreakpoints (client, spec.breakpoints)
    requestChecked (client, "configurationDone", {})
end

local function captureExceptionInfo (client, threadId)
    local body = requestChecked (client, "exceptionInfo", { threadId = threadId }).body

    report ("EXCEPTION id=" .. tostring (body.exceptionId)
        .. " description=" .. tostring (body.description)
        .. " breakMode=" .. tostring (body.breakMode))
end

local function captureLocals (client, frame, frameIndex)
    local scopes = requestChecked (client, "scopes", { frameId = frame.id }).body.scopes
    local reference = scopes[1].variablesReference
    local variables = requestChecked (client, "variables", { variablesReference = reference }).body.variables

    for variableIndex, variable in ipairs (variables) do
        report ("LOCAL #" .. frameIndex .. " " .. variable.name
            .. " : " .. tostring (variable.type)
            .. " = " .. oneLine (variable.value))
    end
end

local function captureExpressions (client, frame, expressions)
    for expressionIndex, expression in ipairs (expressions) do
        local response = client:request ("evaluate", { expression = expression, frameId = frame.id, context = "repl" })
        local result = response.success and ("= " .. oneLine (response.body.result)) or ("ERROR " .. oneLine (response.message))

        report ("EVAL " .. expression .. " " .. result)
    end
end

local function captureFrames (client, onStop, threadId)
    local frames = requestChecked (client, "stackTrace", { threadId = threadId }).body.stackFrames
    local depth = math.min (onStop.stackDepth, #frames)

    for frameNumber = 1, depth do
        report ("FRAME #" .. (frameNumber - 1) .. " " .. getFrameLabel (frames[frameNumber]))

        if onStop.locals then
            captureLocals (client, frames[frameNumber], frameNumber - 1)
        end
    end

    if depth > 0 then
        captureExpressions (client, frames[1], onStop.expressions)
    end
end

local extraCaptures = { exception = captureExceptionInfo }

local function captureStop (run, body)
    report ("STOP " .. run.stopCount .. " reason=" .. tostring (body.reason)
        .. " thread=" .. tostring (body.threadId)
        .. " text=" .. tostring (body.text)
        .. " description=" .. tostring (body.description))

    local extraCapture = extraCaptures[body.reason]

    if extraCapture ~= nil then
        extraCapture (run.client, body.threadId)
    end

    captureFrames (run.client, run.spec.onStop, body.threadId)
end

local function getStopOutcome (run, reason)
    local outcome = stopOutcomeByReason[reason]

    if outcome == nil and run.stopCount >= run.spec.maxStops then
        outcome = "limit"
    end

    return outcome
end

local function onStopped (run, body)
    run.stopCount = run.stopCount + 1
    captureStop (run, body)

    local outcome = getStopOutcome (run, body.reason)

    if outcome == nil then
        requestChecked (run.client, run.spec.afterStop, { threadId = body.threadId })
    end

    return outcome
end

local function onOutput (run, body)
    report ("OUTPUT " .. tostring (body.category) .. " " .. oneLine (body.output))
end

local function onBreakpointChanged (run, body)
    report ("BREAKPOINT-CHANGED id=" .. tostring (body.breakpoint.id)
        .. " verified=" .. tostring (body.breakpoint.verified)
        .. " line=" .. tostring (body.breakpoint.line))
end

local function onProcess (run, body)
    report ("PROCESS name=" .. tostring (body.name) .. " pid=" .. tostring (body.systemProcessId))
end

local function onExited (run, body)
    report ("EXITED code=" .. tostring (body.exitCode))
    return "exited"
end

local eventHandlers = {
    stopped = onStopped,
    output = onOutput,
    breakpoint = onBreakpointChanged,
    process = onProcess,
    exited = onExited,
}

local function runUntilOutcome (run, deadlineMs)
    local outcome = nil

    while outcome == nil do
        local event = run.client:nextEvent (math.max (0, deadlineMs - getNowMs ()))

        if event == nil then
            outcome = "timeout"
        else
            local handler = eventHandlers[event.event]

            if handler ~= nil then
                outcome = handler (run, event.body)
            end
        end
    end

    return outcome
end

local function endSession (client, outcome)
    if terminationRequired[outcome] then
        client:send ("disconnect", { terminateDebuggee = true })
        client:waitForEvent ("terminated", terminateTimeoutMs)
    end

    client:close ()
end

local function runTrace (spec)
    local whatdbgPath = vim.fn.exepath (whatdbgExecutable)
    assert (whatdbgPath ~= "", whatdbgExecutable .. " not found on PATH")

    local client = Dap.spawn ({ whatdbgPath })
    local run = { client = client, spec = spec, stopCount = 0 }
    local deadlineMs = getNowMs () + spec.timeoutMs

    report ("TRACE mode=" .. spec.mode)

    local isCompleted, outcome = pcall (function ()
        openSession (client, spec)
        return runUntilOutcome (run, deadlineMs)
    end)

    if not isCompleted then
        report ("DRIVER ERROR " .. oneLine (outcome))
        outcome = "error"
    end

    report ("END outcome=" .. outcome .. " stops=" .. run.stopCount)
    endSession (client, outcome)
end

local function main (specPath)
    local isDecoded, spec = readSpec (specPath)
    local errors = isDecoded and getSpecErrors (spec) or { "spec: invalid JSON: " .. oneLine (spec) }

    if #errors == 0 then
        runTrace (spec)
        return 0
    end

    for errorIndex, message in ipairs (errors) do
        report ("SPEC ERROR " .. message)
    end

    return exitCodeSpecError
end

assert (arg[1] ~= nil, "usage: nvim --headless -l trace.lua <spec-path>")
os.exit (main (arg[1]))
