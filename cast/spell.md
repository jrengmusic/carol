## index

| alias              | symbol                                               | format   |
| ------------------ | ---------------------------------------------------- | -------- |
| @common            | common.md                                            |          |
| @anthropic         | anthropic.md                                         |          |
| @deepseek          | deepseek.md                                          |          |
| @minimax           | minimax.md                                           |          |
| @secrets           | ../providers/secrets.md                              |          |
| @shapes            | shapes.cast                                          |          |
| @comma             | ,                                                    |          |
| @newline           | U+000A                                               | fromUTF8 |
| @AnthropicSettings | ../providers/generated/anthropic.settings.json       |          |
| @DeepseekSettings  | ../providers/generated/deepseek.settings.json        |          |
| @MinimaxSettings   | ../providers/generated/minimax.settings.json         |          |
| @AnthropicToken    | ../providers/generated/anthropic.token.settings.json |          |
| @DeepseekToken     | ../providers/generated/deepseek.token.settings.json  |          |
| @MinimaxToken      | ../providers/generated/minimax.token.settings.json   |          |

## output

+------------------------------------------+--------------------+------------------------------------------+--------------------+
| list                                     | separator          | structure                                | file               |
+==========================================+====================+==========================================+====================+
| - [list]: @anthropic:permission member   | - [list]: @newline | @shapes:[no-banner]settings              | @AnthropicSettings |
| - [list]: @common:allow                  | - [list]: @newline | - [list]: @shapes:member                 |                    |
| - [list]: @common:ask                    | - [list]: @comma   | - [list]: @shapes:rule                   |                    |
| - [list]: @anthropic:member              | - [list]: @comma   | - [list]: @shapes:rule                   |                    |
| - [list]: @anthropic:env                 | - [list]: @newline | - [list]: @shapes:member                 |                    |
| > - [list]: @anthropic:model setting     | - [list]: @comma   | - [list]: @shapes:entry                  |                    |
|                                          | > - [list]: @comma | - model-settings: @shapes:model-settings |                    |
|                                          |                    | > - [list]: @shapes:model-setting        |                    |
+------------------------------------------+--------------------+------------------------------------------+--------------------+
| - [list]: @deepseek:permission member    | - [list]: @newline | @shapes:[no-banner]settings              | @DeepseekSettings  |
| - [list]: @common:allow                  | - [list]: @newline | - [list]: @shapes:member                 |                    |
| - [list]: @common:ask                    | - [list]: @comma   | - [list]: @shapes:rule                   |                    |
| - [list]: @deepseek:member               | - [list]: @comma   | - [list]: @shapes:rule                   |                    |
| - [list]: @deepseek:env                  | - [list]: @newline | - [list]: @shapes:member                 |                    |
|                                          | - [list]: @comma   | - [list]: @shapes:entry                  |                    |
+------------------------------------------+--------------------+------------------------------------------+--------------------+
| - [list]: @minimax:permission member     | - [list]: @newline | @shapes:[no-banner]settings              | @MinimaxSettings   |
| - [list]: @common:allow                  | - [list]: @newline | - [list]: @shapes:member                 |                    |
| - [list]: @common:ask                    | - [list]: @comma   | - [list]: @shapes:rule                   |                    |
| - [list]: @minimax:member                | - [list]: @comma   | - [list]: @shapes:rule                   |                    |
| - [list]: @minimax:env                   | - [list]: @newline | - [list]: @shapes:member                 |                    |
|                                          | - [list]: @comma   | - [list]: @shapes:entry                  |                    |
+------------------------------------------+--------------------+------------------------------------------+--------------------+
| - [list]: @secrets:secret:name=anthropic | - [list]: @comma   | @shapes:[no-banner]token-settings        | @AnthropicToken    |
|                                          |                    | - [list]: @shapes:token-entry            |                    |
+------------------------------------------+--------------------+------------------------------------------+--------------------+
| - [list]: @secrets:secret:name=deepseek  | - [list]: @comma   | @shapes:[no-banner]token-settings        | @DeepseekToken     |
|                                          |                    | - [list]: @shapes:token-entry            |                    |
+------------------------------------------+--------------------+------------------------------------------+--------------------+
| - [list]: @secrets:secret:name=minimax   | - [list]: @comma   | @shapes:[no-banner]token-settings        | @MinimaxToken      |
|                                          |                    | - [list]: @shapes:token-entry            |                    |
+------------------------------------------+--------------------+------------------------------------------+--------------------+

## toolchain

| argument  | command | flag                                                                                            |
| --------- | ------- | ----------------------------------------------------------------------------------------------- |
| anthropic | rm      | -f ../../.config/claude/settings.json                                                           |
| anthropic | cp      | ../providers/generated/anthropic.settings.json ../../.config/claude/settings.json               |
| anthropic | cp      | ../providers/generated/anthropic.token.settings.json ../providers/generated/token.settings.json |
| deepseek  | rm      | -f ../../.config/claude/settings.json                                                           |
| deepseek  | cp      | ../providers/generated/deepseek.settings.json ../../.config/claude/settings.json                |
| deepseek  | cp      | ../providers/generated/deepseek.token.settings.json ../providers/generated/token.settings.json  |
| minimax   | rm      | -f ../../.config/claude/settings.json                                                           |
| minimax   | cp      | ../providers/generated/minimax.settings.json ../../.config/claude/settings.json                 |
| minimax   | cp      | ../providers/generated/minimax.token.settings.json ../providers/generated/token.settings.json   |
