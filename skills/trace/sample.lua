local scriptDirectory = vim.fn.fnamemodify (arg[0], ":h")
package.path = scriptDirectory .. "/?.lua;" .. package.path

local Driver = require ("driver")

local adapterId = "whatdbg-sample"
local pauseReason = "pause"
local percentScale = 100

local report = Driver.report
local getNowMs = Driver.getNowMs
local requestChecked = Driver.requestChecked

local threadSelectors = {
    main = function (threads) return { threads[1] } end,
    all = function (threads) return threads end,
}

local sampleFields = {
    threads = {
        kind = "value",
        expects = "main or all",
        check = function (value) return threadSelectors[value] ~= nil end,
    },
    delayMs = Driver.count,
    intervalMs = Driver.count,
    maxSamples = Driver.count,
    stackDepth = Driver.count,
    topRows = Driver.count,
    pauseTimeoutMs = Driver.count,
}

local function describeStop (stop)
    local description = "no stopped event"

    if stop ~= nil then
        description = "stopped reason=" .. tostring (stop.reason)
    end

    return description
end

local function onStopped (run, body, arrivedMs)
    run.stop = body
    run.stopMs = arrivedMs
end

local eventHandlers = vim.tbl_extend ("error", Driver.eventHandlers, { stopped = onStopped })

local function pumpEvents (run, targetMs)
    while run.outcome == nil and run.stop == nil and getNowMs () < targetMs do
        local event = run.client:nextEvent (targetMs - getNowMs ())

        if event ~= nil then
            local handler = eventHandlers[event.event]

            if handler ~= nil then
                run.outcome = handler (run, event.body, event.arrivedMs)
            end
        end
    end
end

local function waitUntil (run, targetMs)
    pumpEvents (run, targetMs)

    if run.outcome == nil and run.stop == nil and run.deadlineMs <= targetMs then
        run.outcome = "timeout"
    end
end

local function waitForDelay (run, wakeMs)
    waitUntil (run, math.min (wakeMs, run.deadlineMs))

    if run.outcome == nil then
        assert (run.stop == nil, "unrequested " .. describeStop (run.stop))
    end
end

local function waitForPauseStop (run)
    waitUntil (run, math.min (getNowMs () + run.spec.pauseTimeoutMs, run.deadlineMs))

    if run.outcome == nil then
        local isPauseStop = run.stop ~= nil and run.stop.reason == pauseReason

        assert (isPauseStop, "expected stopped reason=" .. pauseReason .. " within " .. run.spec.pauseTimeoutMs
            .. " ms, got " .. describeStop (run.stop))
    end
end

local function getOrCreateTally (run, thread)
    local tally = run.tallies[thread.id]

    if tally == nil then
        tally = { sampleCount = 0, inclusive = {}, leaf = {} }
        run.tallies[thread.id] = tally
        table.insert (run.threadOrder, thread.id)
    end

    return tally
end

local function addCount (counts, name)
    counts[name] = (counts[name] or 0) + 1
end

local function addFrames (tally, frames)
    local seen = {}

    tally.sampleCount = tally.sampleCount + 1

    for frameIndex, frame in ipairs (frames) do
        if seen[frame.name] == nil then
            seen[frame.name] = true
            addCount (tally.inclusive, frame.name)
        end
    end

    if frames[1] ~= nil then
        addCount (tally.leaf, frames[1].name)
    end
end

local function captureThread (run, thread)
    local response = requestChecked (run.client, "stackTrace", { threadId = thread.id })
    local frames = vim.list_slice (response.body.stackFrames, 1, run.spec.stackDepth)

    report (string.format ("SAMPLE %d t=%.0f thread=%s %s",
        run.sampleCount + 1, run.stopMs - run.startMs, tostring (thread.id), tostring (thread.name)))

    for frameNumber, frame in ipairs (frames) do
        report ("FRAME #" .. (frameNumber - 1) .. " " .. Driver.getFrameLabel (frame))
    end

    addFrames (getOrCreateTally (run, thread), frames)
end

local function getOutcomeAfterSample (run)
    local outcome = nil

    if run.sampleCount >= run.spec.maxSamples then
        outcome = "limit"
    end

    return outcome
end

local function captureSample (run)
    requestChecked (run.client, "pause")
    waitForPauseStop (run)

    if run.outcome == nil then
        local threads = requestChecked (run.client, "threads").body.threads

        for threadIndex, thread in ipairs (threadSelectors[run.spec.threads] (threads)) do
            captureThread (run, thread)
        end

        run.sampleCount = run.sampleCount + 1
        run.outcome = getOutcomeAfterSample (run)
    end
end

local function resumeTarget (run)
    requestChecked (run.client, "continue", { threadId = run.stop.threadId })
    run.stop = nil

    return getNowMs () + run.spec.intervalMs
end

local function runSamples (run)
    local wakeMs = run.startMs + run.spec.delayMs

    while run.outcome == nil do
        waitForDelay (run, wakeMs)

        if run.outcome == nil then
            captureSample (run)
        end

        if run.outcome == nil then
            wakeMs = resumeTarget (run)
        end
    end
end

local function getRankedNames (counts, topRows)
    local names = vim.tbl_keys (counts)

    table.sort (names, function (left, right)
        if counts[left] ~= counts[right] then
            return counts[left] > counts[right]
        end

        return left < right
    end)

    return vim.list_slice (names, 1, topRows)
end

local function reportTally (label, threadId, counts, sampleCount, topRows)
    for nameIndex, name in ipairs (getRankedNames (counts, topRows)) do
        report (string.format ("%s thread=%s %d %.1f%% %s",
            label, tostring (threadId), counts[name], counts[name] / sampleCount * percentScale, name))
    end
end

local function reportAggregates (run)
    for threadIndex, threadId in ipairs (run.threadOrder) do
        local tally = run.tallies[threadId]

        reportTally ("INCLUSIVE", threadId, tally.inclusive, tally.sampleCount, run.spec.topRows)
        reportTally ("LEAF", threadId, tally.leaf, tally.sampleCount, run.spec.topRows)
    end
end

local function openSession (run)
    Driver.initializeSession (run.client, run.spec, adapterId)
    requestChecked (run.client, "configurationDone", {})
    run.startMs = getNowMs ()
end

local function runSample (spec)
    local client = Driver.spawnClient ()
    local run = {
        client = client,
        spec = spec,
        deadlineMs = getNowMs () + spec.timeoutMs,
        sampleCount = 0,
        tallies = {},
        threadOrder = {},
    }

    local isCompleted, failure = pcall (function ()
        openSession (run)
        runSamples (run)
    end)

    if not isCompleted then
        report ("DRIVER ERROR " .. Driver.oneLine (failure))
        run.outcome = "error"
    end

    reportAggregates (run)
    report ("END outcome=" .. run.outcome .. " samples=" .. run.sampleCount)
    Driver.endSession (client, run.outcome)
end

assert (arg[1] ~= nil, "usage: nvim --headless -l sample.lua <spec-path>")
os.exit (Driver.main (arg[1], sampleFields, runSample))
