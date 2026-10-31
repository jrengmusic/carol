import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const END_CONFIG = path.join(os.homedir(), '.config', 'end', 'end.lua')
const THEME_FILE = path.join(import.meta.dirname, '..', 'themes', 'end.json')
const COLOURS_PATTERN = /colours\s*=\s*\{([\s\S]*?)\n\t\},/
const COLOUR_PATTERN = /(\w+)\s*=\s*"#([0-9A-Fa-f]{6})(?:[0-9A-Fa-f]{2})?"/g
const STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900]
const BASE_STEP = 200
const LAST_STEP = 900

function readColours() {
  const block = readFileSync(END_CONFIG, 'utf8').match(COLOURS_PATTERN)[1]
  return Object.fromEntries([...block.matchAll(COLOUR_PATTERN)].map((match) => [match[1], '#' + match[2].toLowerCase()]))
}

function toChannels(hex) {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
}

function mix(from, to, ratio) {
  const target = toChannels(to)
  return '#' + toChannels(from).map((channel, index) => Math.round(channel + (target[index] - channel) * ratio).toString(16).padStart(2, '0')).join('')
}

function makeScale(bright, normal, background) {
  return Object.fromEntries(
    STEPS.map((step) => [step, step === 100 ? bright : mix(normal, background, (step - BASE_STEP) / (LAST_STEP - BASE_STEP))]),
  )
}

function makeTheme(colours) {
  const background = colours.background
  return {
    $schema: 'https://opencode.ai/theme.json',
    base: {
      categorical: ['accent', 'purple', 'green', 'blue', 'yellow'],
      text: {
        base: '$hue.neutral.200',
        muted: '$hue.neutral.400',
        action: {
          primary: { base: '$text.base', $disabled: '$hue.neutral.500', $focused: '$hue.neutral.900', $selected: '$hue.interactive.100' },
          secondary: { base: '$text.muted', $hovered: '$text.base' },
          destructive: { base: '$hue.red.200', $disabled: '$hue.neutral.500' },
        },
        formfield: {
          base: '$hue.neutral.200',
          $hovered: '$hue.interactive.100',
          $focused: '$hue.interactive.100',
          $pressed: '$hue.interactive.100',
          $disabled: '$hue.neutral.500',
          $selected: '$hue.interactive.100',
        },
        feedback: {
          error: { base: '$hue.red.200' },
          warning: { base: '$hue.yellow.200' },
          success: { base: '$hue.green.200' },
          info: { base: '$hue.cyan.100' },
        },
      },
      background: {
        base: 'transparent',
        raised: { base: '$hue.neutral.700', high: '$hue.neutral.600', max: '$hue.neutral.500' },
        action: {
          primary: { base: 'transparent', $hovered: '$hue.neutral.700', $focused: '$hue.interactive.100', $selected: 'transparent' },
          secondary: { base: 'transparent' },
          destructive: { base: '$hue.red.200' },
        },
        formfield: { base: '$background.base' },
        feedback: {
          error: { base: '$background.base' },
          warning: { base: '$background.base' },
          success: { base: '$background.base' },
          info: { base: '$background.base' },
        },
      },
      border: { base: '$hue.neutral.600' },
      scrollbar: { base: '$hue.neutral.500' },
      diff: {
        text: { added: '$hue.green.100', removed: '$hue.red.200', context: '$hue.neutral.400', hunkHeader: '$hue.neutral.400' },
        background: { added: '$hue.green.800', removed: '$hue.red.800', context: 'transparent' },
        highlight: { added: '$hue.green.100', removed: '$hue.red.100' },
        lineNumber: { text: '$hue.neutral.500', background: { added: '$hue.green.800', removed: '$hue.red.800' } },
      },
      syntax: {
        comment: '$hue.neutral.500',
        keyword: '$hue.cyan.100',
        function: '$hue.blue.100',
        variable: '$hue.neutral.200',
        string: '$hue.green.200',
        number: '$hue.yellow.200',
        type: '$hue.blue.200',
        operator: '$hue.purple.100',
        punctuation: '$hue.neutral.300',
      },
      markdown: {
        text: '$hue.neutral.200',
        heading: '$hue.cyan.100',
        link: '$hue.blue.100',
        linkText: '$hue.cyan.100',
        code: '$hue.green.200',
        blockQuote: '$hue.neutral.400',
        emphasis: '$hue.yellow.200',
        strong: '$hue.green.100',
        horizontalRule: '$hue.neutral.500',
        listItem: '$hue.cyan.100',
        listEnumeration: '$hue.cyan.100',
        image: '$hue.blue.100',
        imageText: '$hue.cyan.100',
        codeBlock: '$hue.neutral.200',
      },
      '@dialog': { background: { base: '$background.raised.base', action: { primary: { $hovered: '$background.raised.high' } } } },
    },
    dark: {
      hue: {
        gray: {
          100: colours.bright_white,
          200: colours.foreground,
          300: colours.cyan,
          400: colours.cursor,
          500: colours.bright_black,
          600: mix(colours.bright_black, background, 0.5),
          700: colours.status_bar_label_bg,
          800: mix(colours.status_bar_label_bg, background, 0.5),
          900: background,
        },
        red: makeScale(colours.bright_red, colours.red, background),
        orange: makeScale(mix(colours.bright_red, colours.bright_yellow, 0.5), mix(colours.red, colours.yellow, 0.5), background),
        yellow: makeScale(colours.bright_yellow, colours.yellow, background),
        green: makeScale(colours.bright_green, colours.green, background),
        cyan: makeScale(colours.bright_cyan, colours.cyan, background),
        blue: makeScale(colours.bright_blue, colours.blue, background),
        purple: makeScale(colours.bright_magenta, colours.magenta, background),
        accent: '$hue.cyan',
        interactive: '$hue.cyan',
        neutral: '$hue.gray',
      },
    },
  }
}

mkdirSync(path.dirname(THEME_FILE), { recursive: true })
writeFileSync(THEME_FILE, JSON.stringify(makeTheme(readColours()), null, 2) + '\n')
