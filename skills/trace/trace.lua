local scriptDirectory = vim.fn.fnamemodify (arg[0], ":h")
package.path = scriptDirectory .. "/?.lua;" .. package.path

local Driver = require ("driver")

local adapterId = "whatdbg-trace"

local report = Driver.report
local oneLine = Driver.oneLine
local getNowMs = Driver.getNowMs
local requestChecked = Driver.requestChecked
local getFrameLabel = Driver.getFrameLabel

local afterStopActions = { continue = true, next = true, stepIn = true, stepOut = true }

local traceFields = {
    breakpoints = {
        type = "list",
        expects = "list",
        item = { type = "object", expects = "object", fields = { file = Driver.text, line = Driver.count } },
    },
    onStop = {
        type = "object",
        expects = "object",
        fields = {
            stackDepth = Driver.count,
            locals = Driver.flag,
            expressions = { type = "list", expects = "list", item = Driver.text },
        },
    },
    afterStop = {
        type = "value",
        expects = "continue, next, stepIn or stepOut",
        check = function (value) return afterStopActions[value] ~= nil end,
    },
    maxStops = Driver.count,
}

local stopOutcomeByReason = { exception = "crash" }

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
    Driver.initializeSession (client, spec, adapterId)
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

local function onBreakpointChanged (run, body)
    report ("BREAKPOINT-CHANGED id=" .. tostring (body.breakpoint.id)
        .. " verified=" .. tostring (body.breakpoint.verified)
        .. " line=" .. tostring (body.breakpoint.line))
end

local events = vim.tbl_extend ("error", Driver.events, {
    stopped = onStopped,
    breakpoint = onBreakpointChanged,
})

local function runUntilOutcome (run, deadlineMs)
    local outcome = nil

    while outcome == nil do
        local event = run.client:nextEvent (math.max (0, deadlineMs - getNowMs ()))

        if event == nil then
            outcome = "timeout"
        else
            local onEvent = events[event.event]

            if onEvent ~= nil then
                outcome = onEvent (run, event.body)
            end
        end
    end

    return outcome
end

local function runTrace (spec)
    local client = Driver.spawnClient ()
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
    Driver.endSession (client, spec, outcome)
end

assert (arg[1] ~= nil, "usage: nvim --headless -l trace.lua <spec-path>")
os.exit (Driver.main (arg[1], traceFields, runTrace))
