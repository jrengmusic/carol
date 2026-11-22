-- Finds every violation of the named rules in scope and writes CLEAN-UP-<subject>.md.
-- With --check, prints the findings and writes nothing.
local scriptDirectory = vim.fn.fnamemodify (arg[0], ":h")
package.path = scriptDirectory .. "/?.lua;" .. package.path

local Arguments = require ("arguments")
local Repository = require ("repository")
local Syntax = require ("syntax")
local Tracker = require ("tracker")

local usage = "usage: nvim --headless -l scan.lua --rules <id,id> [--subject <kebab> --objective <text> | --check] <path>..."
local flagSpec = { rules = "value", subject = "value", objective = "value", check = "switch" }
local sourceExtensions = { h = true, cpp = true }
local unlimitedDepth = math.huge

local sections = {
    formatting = { "special-operators", "braces-new-line", "comment-spacing" },
    pointers = { "pointer-ref-placement", "const-placement", "no-multiple-pointers" },
    literals = { "numeric-literals", "null-to-nullptr", "no-platform-macro-names" },
    namespaces = { "no-anonymous-namespaces-allowed", "no-namespace-detail-allowed", "namespace-enclosure-format" },
    ["modern-cpp"] = { "override-without-virtual", "no-c-casts", "no-c-math", "no-dbg", "no-pair-first-second", "no-string-equality", "no-implicit-null-check" },
    structure = { "no-raw-new-delete", "no-manual-raii-destructor", "no-friend", "no-local-struct", "no-forward-declarations" },
    ["control-flow"] = { "no-else-after-return", "no-bail-out-guard" },
    names = { "no-kind-prefix", "no-variable-underscores", "no-type-suffix", "apply-without-callable", "forbidden-terms" },
}

sections.coding = {}
for index, name in ipairs ({ "formatting", "pointers", "literals", "namespaces", "modern-cpp", "structure", "control-flow" }) do
    vim.list_extend (sections.coding, sections[name])
end

sections.all = {}
vim.list_extend (sections.all, sections.coding)
vim.list_extend (sections.all, sections.names)

local Scan = {}

function Scan.getRules (ruleList)
    local rules = {}
    local seen = {}

    for token in vim.gsplit (ruleList, ",", { plain = true, trimempty = true }) do
        local ruleIds = sections[token] or { token }

        for ruleIndex, ruleId in ipairs (ruleIds) do
            if not seen[ruleId] then
                seen[ruleId] = true
                local rulePath = scriptDirectory .. "/rules/" .. ruleId .. ".lua"
                assert (vim.uv.fs_stat (rulePath) ~= nil, "unknown rule " .. ruleId)
                table.insert (rules, require ("rules." .. ruleId))
            end
        end
    end

    return rules
end

local function isSource (path)
    return sourceExtensions[vim.fn.fnamemodify (path, ":e")] == true
end

function Scan.getFiles (paths)
    local files = {}

    for pathIndex, path in ipairs (paths) do
        if vim.fn.isdirectory (path) == 1 then
            for name, entryType in vim.fs.dir (path, { depth = unlimitedDepth }) do
                local filePath = vim.fs.joinpath (path, name)
                if entryType == "file" and isSource (filePath) then table.insert (files, vim.fs.normalize (filePath)) end
            end
        elseif isSource (path) then
            table.insert (files, vim.fs.normalize (path))
        end
    end

    table.sort (files)
    return files
end

-- Every finding of every rule, by file then line then rule order.
function Scan.getFindings (files, rules)
    local findings = {}

    for fileIndex, file in ipairs (files) do
        local document = Syntax.getDocument (file)
        local fileFindings = {}

        for ruleIndex, rule in ipairs (rules) do
            for findingIndex, finding in ipairs (rule.getFindings (document)) do
                finding.file = file
                finding.rule = rule.id
                finding.ruleIndex = ruleIndex
                finding.order = #fileFindings + 1
                table.insert (fileFindings, finding)
            end
        end

        table.sort (fileFindings, function (left, right)
            if left.line ~= right.line then return left.line < right.line end
            if left.ruleIndex ~= right.ruleIndex then return left.ruleIndex < right.ruleIndex end
            return left.order < right.order
        end)

        vim.list_extend (findings, fileFindings)
    end

    return findings
end

function Scan.getLines (finding)
    if finding.line == finding.lastLine then return tostring (finding.line) end
    return finding.line .. "-" .. finding.lastLine
end

local function printCheck (findings)
    for findingIndex, finding in ipairs (findings) do
        io.write (string.format ("%s:%s\t%s\t%s\t%s\t%s\n", finding.file, Scan.getLines (finding), finding.rule, finding.kind, finding.action, finding.reason or ""))
    end

    io.write (string.format ("findings: %d\n", #findings))
end

local function writeTracker (options, rules, files, findings, paths)
    local trackerPath = Tracker.getPath (options.subject)
    assert (vim.uv.fs_stat (trackerPath) == nil, trackerPath .. " exists; continue the campaign with fix.lua")
    assert (#Repository.getDirtyPaths() == 0, "dirty tree: commit the baseline first")

    local contract = {}
    for ruleIndex, rule in ipairs (rules) do table.insert (contract, rule.heading) end

    local idWidth = Tracker.getIdWidth (#findings)
    local rows = {}

    for findingIndex, finding in ipairs (findings) do
        table.insert (rows, {
            id = string.format ("%0" .. idWidth .. "d", findingIndex),
            file = finding.file,
            lines = Scan.getLines (finding),
            rule = finding.rule,
            kind = finding.kind,
            action = finding.action,
            status = Tracker.pending,
            batch = "",
            notes = finding.reason or "",
        })
    end

    Tracker.write (trackerPath, {
        subject = options.subject,
        date = os.date ("%Y-%m-%d"),
        contract = contract,
        objective = options.objective,
        scope = paths,
        rows = rows,
    })

    local fixCount = 0
    for rowIndex, row in ipairs (rows) do if row.action == "fix" then fixCount = fixCount + 1 end end

    io.write (string.format ("tracker: %s\nfiles: %d\nfindings: %d (fix %d, flag %d)\n", trackerPath, #files, #rows, fixCount, #rows - fixCount))
    io.write (Tracker.getBatchText (Tracker.read (trackerPath), Tracker.batchFiles))
end

local function main ()
    local options, paths = Arguments.getOptions (arg, flagSpec, usage)
    assert (options.rules ~= nil and #paths > 0, usage)

    local rules = Scan.getRules (options.rules)
    local files = Scan.getFiles (paths)
    local findings = Scan.getFindings (files, rules)

    if options.check then
        printCheck (findings)
    else
        options.subject = options.subject or "cleanup"
        options.objective = options.objective or ("Clean up " .. table.concat (paths, ", ") .. " against " .. options.rules)
        writeTracker (options, rules, files, findings, paths)
    end
end

if arg[0]:match ("scan%.lua$") then main() end

return Scan
