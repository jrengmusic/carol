-- Command-line flags for the JANITOR tools. A flag spec maps a name to "value" or "switch".
local Arguments = {}

local flagPrefix = "^%-%-(.+)$"

function Arguments.getOptions (argv, spec, usage)
    local options = {}
    local positionals = {}
    local index = 1

    while index <= #argv do
        local name = argv[index]:match (flagPrefix)

        if name ~= nil then
            assert (spec[name] ~= nil, "unknown flag --" .. name .. "\n" .. usage)

            if spec[name] == "switch" then
                options[name] = true
            else
                index = index + 1
                assert (argv[index] ~= nil, "missing value for --" .. name .. "\n" .. usage)
                options[name] = argv[index]
            end
        else
            table.insert (positionals, argv[index])
        end

        index = index + 1
    end

    return options, positionals
end

return Arguments
