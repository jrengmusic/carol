local Grid = require ("grid")

local Spec = {}

local text = {
    kind = "value",
    expects = "string",
    check = function (value) return type (value) == "string" end,
}

local headerText = {
    kind = "value",
    expects = "string with text",
    check = function (value) return type (value) == "string" and Grid.normalize (value) ~= "" end,
}

local absolutePath = {
    kind = "value",
    expects = "absolute path",
    check = function (value) return type (value) == "string" and vim.fn.isabsolutepath (value) == 1 end,
}

local schema = {
    kind = "object",
    expects = "object",
    fields = {
        workbook = absolutePath,
        output = absolutePath,
        sheets = {
            kind = "list",
            expects = "non-empty list",
            item = {
                kind = "object",
                expects = "object",
                fields = {
                    name = text,
                    columns = { kind = "list", expects = "non-empty list", item = headerText },
                },
            },
        },
    },
}

local validators = {}

local function validate (value, fieldSchema, label, errors)
    validators[fieldSchema.kind] (value, fieldSchema, label, errors)
end

function validators.value (value, fieldSchema, label, errors)
    if not fieldSchema.check (value) then
        table.insert (errors, label .. ": expected " .. fieldSchema.expects)
    end
end

function validators.list (value, fieldSchema, label, errors)
    if type (value) == "table" and vim.islist (value) and #value > 0 then
        for itemIndex, item in ipairs (value) do
            validate (item, fieldSchema.item, label .. "[" .. itemIndex .. "]", errors)
        end
    else
        table.insert (errors, label .. ": expected " .. fieldSchema.expects)
    end
end

local function getSortedKeys (map)
    local keys = vim.tbl_keys (map)

    table.sort (keys)
    return keys
end

function validators.object (value, fieldSchema, label, errors)
    if type (value) == "table" then
        for nameIndex, name in ipairs (getSortedKeys (fieldSchema.fields)) do
            if value[name] == nil then
                table.insert (errors, label .. "." .. name .. ": missing, expected " .. fieldSchema.fields[name].expects)
            else
                validate (value[name], fieldSchema.fields[name], label .. "." .. name, errors)
            end
        end

        for nameIndex, name in ipairs (getSortedKeys (value)) do
            if fieldSchema.fields[name] == nil then
                table.insert (errors, label .. "." .. name .. ": unknown field")
            end
        end
    else
        table.insert (errors, label .. ": expected object")
    end
end

local function decode (content)
    local isDecoded, spec = pcall (vim.json.decode, content)

    return isDecoded and spec or nil, isDecoded and {} or { "spec: invalid JSON: " .. tostring (spec) }
end

function Spec.read (path)
    local file = io.open (path, "rb")
    local spec = nil
    local errors = { "spec: cannot open " .. path }

    if file ~= nil then
        spec, errors = decode (file:read ("*a"))
        file:close ()
    end

    if #errors == 0 then
        validate (spec, schema, "spec", errors)
    end

    return spec, errors
end

return Spec
