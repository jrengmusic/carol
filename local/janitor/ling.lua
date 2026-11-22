local Ling = {}

local manifestName = "project-info.md"
local manifestCache = {}

local function getDirectory (filePath)
    return vim.fn.fnamemodify (vim.fs.normalize (filePath), ":p:h")
end

function Ling.getManifest (filePath)
    local directory = getDirectory (filePath)

    if manifestCache[directory] ~= nil then
        return manifestCache[directory] or nil
    end

    local found = vim.fs.find (manifestName, { path = directory, upward = true })[1]
    manifestCache[directory] = found or false
    return found
end

local function callOperation (filePath, operation, extraArgs)
    local manifest = Ling.getManifest (filePath)
    if manifest == nil then return nil end

    local command = { "ling", operation, manifest }
    vim.list_extend (command, extraArgs)

    local result = vim.system (command, { text = true }):wait()
    if result.code ~= 0 then return nil end

    local output = vim.trim (result.stdout or "")
    if output == "" then return nil end

    local ok, payload = pcall (vim.json.decode, output)
    if not ok or type (payload) ~= "table" then return nil end
    if payload.result == vim.NIL then return nil end

    return payload.result
end

function Ling.getHover (filePath, line, column)
    local fullPath = vim.fn.fnamemodify (filePath, ":p")
    local response = callOperation (fullPath, "hover", { fullPath, tostring (line), tostring (column) })
    if type (response) ~= "table" then return nil end
    if type (response.contents) ~= "table" then return nil end
    return response.contents.value
end

function Ling.getReferences (filePath, line, column)
    local fullPath = vim.fn.fnamemodify (filePath, ":p")
    local response = callOperation (fullPath, "findReferences", { fullPath, tostring (line), tostring (column) })
    if type (response) ~= "table" or #response == 0 then return nil end

    local references = {}
    local seen = {}

    for index, location in ipairs (response) do
        if type (location) == "table" and type (location.uri) == "string" and type (location.range) == "table" then
            local range = location.range
            if range.start.line == range["end"].line then
                local path = vim.fs.normalize (vim.uri_to_fname (location.uri))
                local refLine = range.start.line + 1
                local startColumn = range.start.character
                local endColumn = range["end"].character
                local key = path .. ":" .. refLine .. ":" .. startColumn .. ":" .. endColumn

                if not seen[key] then
                    seen[key] = true
                    table.insert (references, {
                        path = path,
                        line = refLine,
                        startColumn = startColumn,
                        endColumn = endColumn,
                    })
                end
            end
        end
    end

    return #references > 0 and references or nil
end

local function readFileLines (path)
    local handle = io.open (path, "rb")
    if handle == nil then return nil end
    local source = handle:read ("a")
    handle:close()
    return vim.split (source, "\n", { plain = true })
end

function Ling.getRenameEdits (filePath, line, column, oldName, newName)
    local references = Ling.getReferences (filePath, line, column)
    if references == nil then return nil, "no ling index or references found" end

    local fileLinesCache = {}
    local edits = {}
    local touchedFiles = {}

    for index, ref in ipairs (references) do
        local lines = fileLinesCache[ref.path]

        if lines == nil then
            lines = readFileLines (ref.path)
            if lines == nil then return nil, "cannot read referenced file " .. ref.path end
            fileLinesCache[ref.path] = lines
        end

        local lineText = lines[ref.line]
        if lineText == nil then return nil, "reference line out of range in " .. ref.path end

        local slice = lineText:sub (ref.startColumn + 1, ref.endColumn)
        if slice ~= oldName then return nil, "reference text mismatch at " .. ref.path .. ":" .. ref.line end

        touchedFiles[ref.path] = true
        table.insert (edits, {
            file = ref.path,
            line = ref.line,
            startColumn = ref.startColumn,
            endColumn = ref.endColumn,
            text = newName,
        })
    end

    return edits, nil
end

return Ling
