import type {ModApi} from '@commandcode/harness';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const HOME = process.env.HOME ?? '';
const CAROL_ROOT = join(HOME, '.carol');
const CMD_ROOT = join(HOME, '.commandcode');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const LABEL = '\x1b[38;2;105;157;170m';
const DIM = '\x1b[38;2;51;83;91m';
const BUNKER = '\x1b[38;2;9;13;18m';

// name → RGB badge background. The name is SSOT (agent frontmatter `color:`);
// this is the rendering map only, no text or model duplicated here.
const COLOR_RGB: Record<string, string> = {
	cyan: '0;200;216',
	gray: '160;160;160',
	orange: '217;119;41',
};
const DEFAULT_RGB = '78;140;147';

const PRIMARIES = ['COUNSELOR', 'MACHINIST', 'ORACLE'];
const DEFAULT_ROLE = 'COUNSELOR';

function read(path: string): string {
	try {
		return readFileSync(path, 'utf8').trim();
	} catch {
		return '';
	}
}

function frontmatterField(path: string, field: string): string {
	const match = read(path).match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
	return match ? match[1].trim() : '';
}

function commandBody(path: string): string {
	return read(path).replace(/^---[\s\S]*?---/, '').trim();
}

export default function (cmd: ModApi): void {
	let liveModel = '';

	function modelSeat(role: string): string {
		return frontmatterField(join(CMD_ROOT, 'agents', `${role.toLowerCase()}.md`), 'model');
	}

	function roleColor(role: string): string {
		const name = frontmatterField(join(CAROL_ROOT, 'agents', `${role.toLowerCase()}.md`), 'color');
		return COLOR_RGB[name] ?? DEFAULT_RGB;
	}

	function composeStatus(): string {
		const version = read(join(CAROL_ROOT, 'VERSION')) || '?';
		const role = (read(join(CAROL_ROOT, '.carol-role')) || 'COUNSELOR').toUpperCase();
		const model = liveModel || modelSeat(role);
		const badge = `\x1b[48;2;${roleColor(role)}m${BUNKER}${BOLD} ${role} ${RESET}`;
		let out = `${LABEL}◈ CAROL v${version}${RESET}  ${badge}`;
		if (model) out += `  ${DIM}${model}${RESET}`;
		return out;
	}

	function updateStatus(): void {
		cmd.ui.setStatus(composeStatus());
	}

	for (const role of PRIMARIES) {
		cmd.addCommand({
			name: role.toLowerCase(),
			description: frontmatterField(join(CAROL_ROOT, 'commands', `${role.toLowerCase()}.md`), 'description'),
			handler: () => {
				const seat = modelSeat(role);
				if (seat) cmd.setModel(seat);
				writeFileSync(join(CAROL_ROOT, '.carol-role'), role);
				updateStatus();
				return {prompt: commandBody(join(CAROL_ROOT, 'commands', `${role.toLowerCase()}.md`))};
			},
		});
	}

	cmd.hooks({
		onSessionStart: ({source}) => {
			if (source === 'startup') {
				const seat = modelSeat(DEFAULT_ROLE);
				if (seat) cmd.setModel(seat);
				writeFileSync(join(CAROL_ROOT, '.carol-role'), DEFAULT_ROLE);
			}
			updateStatus();
		},
		onSessionEnd: () => cmd.ui.setStatus(null),
	});

	cmd.on('model_request_start', ({model}) => {
		if (model) liveModel = model;
		updateStatus();
	});

	cmd.on('turn_start', updateStatus);
}
