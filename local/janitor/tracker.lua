-- CLEAN-UP-<subject>.md: the only campaign state. Format: skills/clean-up-writer/SKILL.md.
local Tracker = {}

Tracker.pending = "PENDING"
Tracker.done = "DONE"
Tracker.flagged = "FLAGGED"
-- A batch is the PENDING rows of at most this many files (skills/iterative-contract-sop).
Tracker.batchFiles = 5

local statusInProgress = "In Progress"
local statusComplete = "Complete"
local columns = { "id", "file", "lines", "rule", "kind", "action", "status", "batch", "notes" }
local headerRow = "| ID | File | Lines | Rule | Kind | Action | Status | Batch | Notes |"
local separatorRow = "|----|------|-------|------|------|--------|--------|-------|-------|"
local pipe = "|"
local escapedPipe = "\\|"
-- \1, not \0: a LuaJIT pattern cannot hold \0.
local pipePlaceholder = "\1"
local minimumIdWidth = 3

function Tracker.getPath (subject)
    return "CLEAN-UP-" .. subject .. ".md"
end

local function escapeCell (value)
    return (tostring (value or ""):gsub ("|", escapedPipe))
end

local function getCells (row)
    local protected = row:gsub ("\\|", pipePlaceholder)
    local cells = {}

    for cell in protected:gmatch ("|([^|]*)") do
        table.insert (cells, (vim.trim (cell):gsub (pipePlaceholder, pipe)))
    end

    table.remove (cells)
    return cells
end

local function getCounts (rows)
    local counts = { total = #rows, [Tracker.done] = 0, [Tracker.flagged] = 0, [Tracker.pending] = 0 }

    for rowIndex, row in ipairs (rows) do
        counts[row.status] = counts[row.status] + 1
    end

    return counts
end

function Tracker.write (path, tracker)
    local counts = getCounts (tracker.rows)
    local lines = {
        "# CLEAN-UP — " .. tracker.subject,
        "Date: " .. tracker.date,
        "Status: " .. (counts[Tracker.pending] == 0 and statusComplete or statusInProgress),
        "Contract: " .. table.concat (tracker.contract, "; "),
        "",
        "## Objective",
        tracker.objective,
        "",
        "## Scope",
    }

    for scopePathIndex, scopePath in ipairs (tracker.scope) do
        table.insert (lines, "- " .. scopePath)
    end

    vim.list_extend (lines, { "", "## Tracker", "", headerRow, separatorRow })

    for rowIndex, row in ipairs (tracker.rows) do
        local cells = {}

        for columnIndex, column in ipairs (columns) do
            table.insert (cells, escapeCell (row[column]))
        end

        table.insert (lines, "| " .. table.concat (cells, " | ") .. " |")
    end

    vim.list_extend (lines, {
        "",
        "## Progress",
        "- Total: " .. counts.total,
        "- Done: " .. counts[Tracker.done],
        "- Flagged: " .. counts[Tracker.flagged],
        "- Pending: " .. counts[Tracker.pending],
    })

    local handle = assert (io.open (path, "wb"), "cannot write " .. path)
    handle:write (table.concat (lines, "\n") .. "\n")
    handle:close()
end

function Tracker.read (path)
    local tracker = { contract = {}, scope = {}, rows = {} }
    local section = nil

    for text in io.lines (path) do
        local heading = text:match ("^## (.+)$")

        if heading ~= nil then
            section = heading
        elseif text:match ("^# CLEAN%-UP — ") then
            tracker.subject = text:match ("^# CLEAN%-UP — (.+)$")
        elseif text:match ("^Date: ") then
            tracker.date = text:match ("^Date: (.+)$")
        elseif text:match ("^Contract: ") then
            tracker.contract = vim.split (text:match ("^Contract: (.+)$"), "; ", { plain = true })
        elseif section == "Objective" and text ~= "" then
            tracker.objective = text
        elseif section == "Scope" and text:match ("^%- ") then
            table.insert (tracker.scope, text:sub (3))
        elseif section == "Tracker" and text:match ("^| %w") and text ~= headerRow then
            local cells = getCells (text)
            local row = {}

            for index, column in ipairs (columns) do
                row[column] = cells[index]
            end

            table.insert (tracker.rows, row)
        end
    end

    return tracker
end

function Tracker.getIdWidth (total)
    return math.max (minimumIdWidth, #tostring (total))
end

-- The PENDING rows of the first maxFiles files that have PENDING rows, in row order.
function Tracker.getNextBatch (tracker, maxFiles)
    local files = {}
    local isInBatch = {}
    local rows = {}

    for rowIndex, row in ipairs (tracker.rows) do
        if row.status == Tracker.pending then
            if not isInBatch[row.file] and #files < maxFiles then
                isInBatch[row.file] = true
                table.insert (files, row.file)
            end

            if isInBatch[row.file] then table.insert (rows, row) end
        end
    end

    return files, rows
end

function Tracker.getNextBatchNumber (tracker)
    local highest = 0

    for rowIndex, row in ipairs (tracker.rows) do
        local batch = tonumber (row.batch)
        if batch ~= nil and batch > highest then highest = batch end
    end

    return highest + 1
end

function Tracker.getCounts (tracker)
    return getCounts (tracker.rows)
end

-- The next batch as one line per row, for the model to classify.
function Tracker.getBatchText (tracker, maxFiles)
    local files, rows = Tracker.getNextBatch (tracker, maxFiles)
    local lines = { "next batch: " .. #rows .. " rows in " .. #files .. " files" }

    for rowIndex, row in ipairs (rows) do
        table.insert (lines, string.format ("%s %s:%s %s | %s | %s%s", row.id, row.file, row.lines, row.rule, row.kind, row.action,
            row.notes ~= "" and (" | " .. row.notes) or ""))
    end

    return table.concat (lines, "\n") .. "\n"
end

function Tracker.getReportText (tracker)
    local counts = getCounts (tracker.rows)
    local lines = { string.format ("report: total %d, done %d, flagged %d", counts.total, counts[Tracker.done], counts[Tracker.flagged]) }

    for rowIndex, row in ipairs (tracker.rows) do
        if row.status == Tracker.flagged then
            table.insert (lines, string.format ("flagged %s %s:%s %s | %s", row.id, row.file, row.lines, row.rule, row.notes))
        end
    end

    return table.concat (lines, "\n") .. "\n"
end

-- The compaction handoff: the campaign state and the next action, read from the tracker alone.
function Tracker.getHandoffText (tracker, subject)
    local counts = getCounts (tracker.rows)
    local hasPending = counts[Tracker.pending] > 0
    local nextAction = hasPending
        and ("classify the batch rows with read_range and set_status, then call fix_batch with subject \"" .. subject .. "\"")
        or "the campaign is complete: pass on the report below verbatim"

    return table.concat ({
        "JANITOR campaign handoff. The tracker is the only state; earlier messages are summarized away.",
        "Tracker: " .. Tracker.getPath (subject),
        "Objective: " .. tracker.objective,
        "Contract: " .. table.concat (tracker.contract, "; "),
        string.format ("Progress: total %d, done %d, flagged %d, pending %d; last batch %d.", counts.total,
            counts[Tracker.done], counts[Tracker.flagged], counts[Tracker.pending], Tracker.getNextBatchNumber (tracker) - 1),
        "Next action: " .. nextAction .. ".",
    }, "\n") .. "\n" .. (hasPending and Tracker.getBatchText (tracker, Tracker.batchFiles) or Tracker.getReportText (tracker))
end

-- set_status: the model's one judgment write. A PENDING fix row becomes a flag, with the reason.
local usage = "usage: nvim --headless -l tracker.lua --subject <kebab> (--row <id> --flag <reason> | --handoff)"
local flagAction = "flag"
local fixAction = "fix"

local function setFlag (options)
    local path = Tracker.getPath (options.subject)
    local tracker = Tracker.read (path)
    local target = vim.iter (tracker.rows):find (function (row) return row.id == options.row end)

    assert (target ~= nil, "no row " .. options.row)
    assert (target.status == Tracker.pending and target.action == fixAction, "row " .. options.row .. " is not a PENDING fix row")

    target.action = flagAction
    target.notes = options.flag
    Tracker.write (path, tracker)
    io.write (string.format ("row %s: action flag (%s)\n", target.id, target.notes))
end

if arg[0]:match ("tracker%.lua$") then
    local scriptDirectory = vim.fn.fnamemodify (arg[0], ":h")
    package.path = scriptDirectory .. "/?.lua;" .. package.path
    local Arguments = require ("arguments")
    local options = Arguments.getOptions (arg, { subject = "value", row = "value", flag = "value", handoff = "switch" }, usage)
    assert (options.subject ~= nil, usage)

    if options.handoff then
        io.write (Tracker.getHandoffText (Tracker.read (Tracker.getPath (options.subject)), options.subject))
    else
        assert (options.row ~= nil and options.flag ~= nil, usage)
        setFlag (options)
    end
end

return Tracker
