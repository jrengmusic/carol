-- Fixes the next batch of CLEAN-UP-<subject>.md through `saw patch`, verifies, tracks, and commits.
local scriptDirectory = vim.fn.fnamemodify (arg[0], ":h")
package.path = scriptDirectory .. "/?.lua;" .. package.path

local Arguments = require ("arguments")
local Repository = require ("repository")
local Scan = require ("scan")
local Syntax = require ("syntax")
local Tracker = require ("tracker")

local usage = "usage: nvim --headless -l fix.lua --subject <kebab> [--no-commit]"
local flagSpec = { subject = "value", ["no-commit"] = "switch" }
local fixAction = "fix"

local Fix = {}

-- Two findings of one rule and kind can share a line; the occurrence index keeps their keys apart.
local function getKey (rule, kind, lines, occurrences)
    local base = rule .. "\t" .. kind .. "\t" .. lines
    occurrences[base] = (occurrences[base] or 0) + 1
    return base .. "\t" .. occurrences[base]
end

local function getPatch (document, findings)
    local entries = {}
    local files = {}

    for findingIndex, finding in ipairs (findings) do
        for editIndex, edit in ipairs (finding.edits) do
            local file = edit.file or document.path
            if not vim.tbl_contains (files, file) then table.insert (files, file) end

            if edit.isDeleted then
                table.insert (entries, { file = file, line = edit.line, delete = true })
            else
                table.insert (entries, { file = file, line = edit.line, startCol = edit.startColumn, endCol = edit.endColumn, text = edit.text })
            end
        end
    end

    return entries, files
end

local function undo (transaction)
    local undoResult = vim.system ({ "saw", "undo", transaction, "--apply" }, { text = true }):wait()
    assert (undoResult.code == 0, undoResult.stderr)
end

local function getRemainingFixCount (file, rules)
    local count = 0

    for findingIndex, finding in ipairs (Scan.getFindings ({ file }, rules)) do
        if finding.action == fixAction then count = count + 1 end
    end

    return count
end

local function applyFixes (document, findings, rules, flaggedFixCount)
    local entries, files = getPatch (document, findings)
    local originals = vim.tbl_map (function (file) return file == document.path and document or Syntax.getDocument (file) end, files)

    local patchResult = vim.system ({ "saw", "patch", "--apply", "--expect", tostring (#entries) }, { text = true, stdin = vim.json.encode (entries) }):wait()
    if patchResult.code ~= 0 then return "saw patch failed: " .. vim.trim (patchResult.stderr) end

    local transaction = assert (patchResult.stdout:match ("%(tx: ([%w-]+)%)"), patchResult.stdout)

    for originalIndex, original in ipairs (originals) do
        if Syntax.getErrorCount (Syntax.getDocument (original.path)) > Syntax.getErrorCount (original) then
            undo (transaction)
            return "parse errors increased; file restored"
        end
    end

    local remaining = getRemainingFixCount (document.path, rules)

    if remaining ~= flaggedFixCount then
        undo (transaction)
        return "rescan finds " .. remaining .. " fix findings, expected " .. flaggedFixCount .. "; file restored"
    end

    return nil
end

-- Sets status, batch, and notes on the rows of one file.
function Fix.setFileRows (file, rows, rules, batch)
    local document = Syntax.getDocument (file)
    local findingsByKey = {}
    local findingOccurrences = {}

    for findingIndex, finding in ipairs (Scan.getFindings ({ file }, rules)) do
        findingsByKey[getKey (finding.rule, finding.kind, Scan.getLines (finding), findingOccurrences)] = finding
    end

    local fixRows = {}
    local fixFindings = {}
    local flaggedFixCount = 0
    local isUnchanged = true
    local rowOccurrences = {}

    for rowIndex, row in ipairs (rows) do
        local finding = findingsByKey[getKey (row.rule, row.kind, row.lines, rowOccurrences)]
        if finding == nil then isUnchanged = false end

        if finding ~= nil and finding.action == fixAction then
            if row.action == fixAction then
                table.insert (fixRows, row)
                table.insert (fixFindings, finding)
            else
                flaggedFixCount = flaggedFixCount + 1
            end
        end
    end

    local fixReason = nil

    if not isUnchanged then
        fixReason = "not found at fix time: the file changed after the scan"
        fixRows = rows
    elseif #fixFindings > 0 then
        fixReason = applyFixes (document, fixFindings, rules, flaggedFixCount)
    end

    for rowIndex, row in ipairs (rows) do
        row.batch = tostring (batch)

        if vim.tbl_contains (fixRows, row) and fixReason == nil then
            row.status = Tracker.done
        else
            row.status = Tracker.flagged
            if vim.tbl_contains (fixRows, row) then row.notes = fixReason end
        end
    end
end

local function getCommitMessage (subject, batch, rows, rulesById)
    local lines = { "Clean up " .. subject .. ": batch " .. batch, "" }
    local ruleOrder = {}
    local idsByRule = {}

    for rowIndex, row in ipairs (rows) do
        if idsByRule[row.rule] == nil then
            idsByRule[row.rule] = { [Tracker.done] = {}, [Tracker.flagged] = {} }
            table.insert (ruleOrder, row.rule)
        end

        table.insert (idsByRule[row.rule][row.status], row.id)
    end

    for ruleIndex, ruleId in ipairs (ruleOrder) do
        local ids = idsByRule[ruleId]
        table.insert (lines, string.format ("- %s: fixed rows %s; flagged rows %s", rulesById[ruleId].heading,
            #ids[Tracker.done] > 0 and table.concat (ids[Tracker.done], ", ") or "none",
            #ids[Tracker.flagged] > 0 and table.concat (ids[Tracker.flagged], ", ") or "none"))
    end

    return table.concat (lines, "\n")
end

local function printSummary (tracker, batch, files, rows, commit)
    local done, flagged = {}, {}

    for rowIndex, row in ipairs (rows) do
        if row.status == Tracker.done then table.insert (done, row.id) end
        if row.status == Tracker.flagged then table.insert (flagged, row.id .. " (" .. row.notes .. ")") end
    end

    local counts = Tracker.getCounts (tracker)

    io.write (string.format ("batch: %d\nfiles: %s\ndone: %s\nflagged: %s\ncommit: %s\npending: %d\n",
        batch, table.concat (files, " "), table.concat (done, " "), table.concat (flagged, "; "),
        commit, counts[Tracker.pending]))
    io.write (counts[Tracker.pending] > 0 and Tracker.getBatchText (tracker, Tracker.batchFiles) or Tracker.getReportText (tracker))
end

local function main ()
    local options = Arguments.getOptions (arg, flagSpec, usage)
    assert (options.subject ~= nil, usage)

    local trackerPath = Tracker.getPath (options.subject)
    local tracker = Tracker.read (trackerPath)

    for pathIndex, path in ipairs (Repository.getDirtyPaths()) do
        assert (path == trackerPath, "dirty tree: " .. path .. " is not the tracker; commit or restore it first")
    end

    local files, rows = Tracker.getNextBatch (tracker, Tracker.batchFiles)

    if #files > 0 then
        local batch = Tracker.getNextBatchNumber (tracker)
        local ruleIds = {}
        for rowIndex, row in ipairs (tracker.rows) do
            if not vim.tbl_contains (ruleIds, row.rule) then table.insert (ruleIds, row.rule) end
        end

        local rules = Scan.getRules (table.concat (ruleIds, ","))
        local rulesById = {}
        for ruleIndex, rule in ipairs (rules) do rulesById[rule.id] = rule end

        for fileIndex, file in ipairs (files) do
            Fix.setFileRows (file, vim.tbl_filter (function (row) return row.file == file end, rows), rules, batch)
        end

        Tracker.write (trackerPath, tracker)

        local commit = "skipped (--no-commit)"
        if not options["no-commit"] then
            commit = Repository.commit (getCommitMessage (options.subject, batch, rows, rulesById))
        end

        printSummary (tracker, batch, files, rows, commit)
    else
        io.write ("complete: no PENDING rows\n" .. Tracker.getReportText (tracker))
    end
end

if arg[0]:match ("fix%.lua$") then main() end

return Fix
