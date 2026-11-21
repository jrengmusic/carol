-- The git working tree of the current directory: dirty paths and batch commits.
local Repository = {}

local statusPathPattern = "^.. (.+)$"

local function run (command)
    local result = vim.system (command, { text = true }):wait()
    assert (result.code == 0, table.concat (command, " ") .. " failed: " .. (result.stderr or ""))
    return result.stdout
end

function Repository.getDirtyPaths ()
    local paths = {}

    for line in run ({ "git", "status", "--porcelain", "--untracked-files=all" }):gmatch ("[^\n]+") do
        table.insert (paths, line:match (statusPathPattern))
    end

    return paths
end

-- Commits every change with the message; returns the short hash.
function Repository.commit (message)
    local messagePath = vim.fn.tempname()
    vim.fn.writefile (vim.split (message, "\n", { plain = true }), messagePath)
    run ({ "git", "add", "-A" })
    run ({ "git", "commit", "--quiet", "-F", messagePath })
    vim.fn.delete (messagePath)
    return vim.trim (run ({ "git", "rev-parse", "--short", "HEAD" }))
end

return Repository
