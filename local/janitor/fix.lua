-- Fixes the next batch of CLEAN-UP-<subject>.md through `carol apply`, verifies, tracks, and commits.
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
local removedLinePrefix = "<"

local Fix = {}

-- Two findings of one rule and kind can share a line; the occurrence index keeps their keys apart.
local function getKey (rule, kind, lines, occurrences)
    local base = rule .. "\t" .. kind .. "\t" .. lines
    occurrences[base] = (occurrences[base] or 0) + 1
    return base .. "\t" .. occurrences[base]
end

-- line -> { isDeleted } or { lines }; or nil and the conflict reason.
local function getChanges (document, edits)
    local editsByLine = {}

    for editIndex, edit in ipairs (edits) do
        editsByLine[edit.line] = editsByLine[edit.line] or {}
        table.insert (editsByLine[edit.line], edit)
    end

    local changes = {}

    for line, lineEdits in pairs (editsByLine) do
        local isDeleted = vim.iter (lineEdits):any (function (edit) return edit.isDeleted == true end)

        if isDeleted then
            if #lineEdits > 1 then return nil, "two edits on deleted line " .. line end
            changes[line] = { isDeleted = true }
        else
            table.sort (lineEdits, function (left, right) return left.startColumn < right.startColumn end)

            for editIndex = 2, #lineEdits do
                local previous, current = lineEdits[editIndex - 1], lineEdits[editIndex]
                if previous.endColumn > current.startColumn or previous.startColumn == current.startColumn then
                    return nil, "overlapping edits on line " .. line
                end
            end

            local text = document.lines[line]

            for editIndex = #lineEdits, 1, -1 do
                local edit = lineEdits[editIndex]
                text = text:sub (1, edit.startColumn) .. edit.text .. text:sub (edit.endColumn + 1)
            end

            changes[line] = { lines = vim.split (text, "\n", { plain = true }) }
        end
    end

    return changes, nil
end

local function getPlannedContent (document, changes)
    local planned = {}

    for line, text in ipairs (document.lines) do
        local change = changes[line]

        if change == nil then
            table.insert (planned, text)
        elseif not change.isDeleted then
            vim.list_extend (planned, change.lines)
        end
    end

    return table.concat (planned, "\n") .. (document.hasFinalNewline and "\n" or "")
end

local function getSedText (text)
    return "\\" .. text:gsub ("\\", "\\\\")
end

local function getSedScript (changes)
    local lines = vim.tbl_keys (changes)
    local commands = {}
    table.sort (lines)

    for lineIndex, line in ipairs (lines) do
        local change = changes[line]

        if change.isDeleted then
            table.insert (commands, line .. "d")
        else
            local texts = vim.tbl_map (getSedText, change.lines)
            table.insert (commands, line .. "c\\\n" .. table.concat (texts, "\\\n"))
        end
    end

    return table.concat (commands, "\n")
end

local function writeTemporary (content)
    local path = vim.fn.tempname()
    local handle = assert (io.open (path, "wb"))
    handle:write (content)
    handle:close()
    return path
end

-- The changed-line count exactly as carol apply counts it (bin/carol count_changed_lines).
local function getChangedLineCount (originalPath, plannedPath)
    local output = vim.system ({ "diff", originalPath, plannedPath }, { text = true }):wait().stdout
    local count = 0

    for line in output:gmatch ("[^\n]+") do
        if line:sub (1, 1) == removedLinePrefix then count = count + 1 end
    end

    return count
end

local function restore (document)
    local handle = assert (io.open (document.path, "wb"))
    handle:write (document.source)
    handle:close()
end

local function getRemainingFixCount (file, rules)
    local count = 0

    for findingIndex, finding in ipairs (Scan.getFindings ({ file }, rules)) do
        if finding.action == fixAction then count = count + 1 end
    end

    return count
end

local function restoreAll (documents)
    for index, document in ipairs (documents) do
        restore (document)
    end
end

local function applyFixes (document, findings, rules, flaggedFixCount)
    local editsByFile = {}
    local fileOrder = {}

    for findingIndex, finding in ipairs (findings) do
        for editIndex, edit in ipairs (finding.edits) do
            local targetFile = edit.file or document.path
            if editsByFile[targetFile] == nil then
                editsByFile[targetFile] = {}
                table.insert (fileOrder, targetFile)
            end
            table.insert (editsByFile[targetFile], edit)
        end
    end

    local plans = {}
    local originals = {}

    for fileIndex, targetFile in ipairs (fileOrder) do
        local targetDocument = targetFile == document.path and document or Syntax.getDocument (targetFile)
        local changes, conflict = getChanges (targetDocument, editsByFile[targetFile])
        if changes == nil then return conflict end

        local planned = getPlannedContent (targetDocument, changes)
        local script = getSedScript (changes)
        local sedResult = vim.system ({ "sed", "-E", "-e", script, targetDocument.path }, { text = true }):wait()
        if sedResult.code ~= 0 or sedResult.stdout ~= planned then return "sed plan differs from the computed plan" end

        local plannedPath = writeTemporary (planned)
        local count = getChangedLineCount (targetDocument.path, plannedPath)
        vim.fn.delete (plannedPath)

        table.insert (plans, { document = targetDocument, script = script, count = count })
        table.insert (originals, targetDocument)
    end

    local applied = {}

    for planIndex, plan in ipairs (plans) do
        local applyResult = vim.system ({ "carol", "apply", "--expect", tostring (plan.count), plan.script, plan.document.path }, { text = true }):wait()
        if applyResult.code ~= 0 then
            restoreAll (applied)
            return "carol apply failed: " .. vim.trim (applyResult.stderr or applyResult.stdout or "")
        end
        table.insert (applied, plan.document)
    end

    for planIndex, plan in ipairs (plans) do
        local fixed = Syntax.getDocument (plan.document.path)
        if Syntax.getErrorCount (fixed) > Syntax.getErrorCount (plan.document) then
            restoreAll (applied)
            return "parse errors increased; file restored"
        end
    end

    local remaining = getRemainingFixCount (document.path, rules)

    if remaining ~= flaggedFixCount then
        restoreAll (applied)
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
