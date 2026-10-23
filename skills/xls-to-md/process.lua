local Process = {}

function Process.run (executable, arguments)
    local path = vim.fn.exepath (executable)

    assert (path ~= "", executable .. " not found on PATH")

    local command = { path }
    vim.list_extend (command, arguments)

    local result = vim.system (command):wait ()

    assert (result.code == 0, executable .. " exited " .. result.code .. ": " .. vim.trim (result.stderr .. result.stdout))
    return result.stdout
end

return Process
