local Dap = {}
Dap.__index = Dap

local requestTimeoutMs = 8000
local pollIntervalMs = 20
local closeTimeoutMs = 3000
local headerTerminator = "\r\n\r\n"
local headerTerminatorLength = 4
local nanosecondsPerMillisecond = 1000000

function Dap.getNowMs ()
    return vim.uv.hrtime () / nanosecondsPerMillisecond
end

local function encodeFrame (body)
    local content = vim.json.encode (body)
    return "Content-Length: " .. tostring (#content) .. headerTerminator .. content
end

local function extractFrame (buffer)
    local headerEnd = buffer:find (headerTerminator, 1, true)
    local message = nil
    local remaining = buffer

    if headerEnd ~= nil then
        local length = tonumber (buffer:sub (1, headerEnd - 1):match ("Content%-Length:%s*(%d+)"))
        assert (length ~= nil, "malformed DAP header")

        local bodyStart = headerEnd + headerTerminatorLength
        local bodyEnd = bodyStart + length - 1

        if #buffer >= bodyEnd then
            message = vim.json.decode (buffer:sub (bodyStart, bodyEnd))
            remaining = buffer:sub (bodyEnd + 1)
        end
    end

    return message, remaining
end

function Dap.spawn (command)
    local self = setmetatable ({ buffer = "", messages = {}, nextSeq = 1 }, Dap)

    self.process = vim.system (command, {
        stdin = true,
        stdout = function (readError, data)
            if data ~= nil then
                self.buffer = self.buffer .. data
                self:drainMessages ()
            end
        end,
        stderr = function () end,
    })

    return self
end

function Dap:drainMessages ()
    local message, remaining = extractFrame (self.buffer)

    while message ~= nil do
        message.arrivedMs = Dap.getNowMs ()
        table.insert (self.messages, message)
        self.buffer = remaining
        message, remaining = extractFrame (self.buffer)
    end
end

function Dap:send (command, arguments)
    local seq = self.nextSeq
    self.nextSeq = self.nextSeq + 1

    self.process:write (encodeFrame ({
        seq = seq,
        type = "request",
        command = command,
        arguments = arguments or vim.empty_dict (),
    }))

    return seq
end

function Dap:waitFor (predicate, timeoutMs)
    local found = nil

    vim.wait (timeoutMs, function ()
        for messageIndex, message in ipairs (self.messages) do
            if predicate (message) then
                found = message
                table.remove (self.messages, messageIndex)
                return true
            end
        end

        return false
    end, pollIntervalMs)

    return found
end

function Dap:request (command, arguments)
    local seq = self:send (command, arguments)

    local response = self:waitFor (function (message)
        return message.type == "response" and message.request_seq == seq
    end, requestTimeoutMs)

    assert (response ~= nil, "no response to " .. command .. " within " .. requestTimeoutMs .. " ms")
    return response
end

function Dap:nextEvent (timeoutMs)
    return self:waitFor (function (message)
        return message.type == "event"
    end, timeoutMs)
end

function Dap:waitForEvent (eventName, timeoutMs)
    return self:waitFor (function (message)
        return message.type == "event" and message.event == eventName
    end, timeoutMs)
end

function Dap:close ()
    self.process:write (nil)
    self.process:wait (closeTimeoutMs)
end

return Dap
