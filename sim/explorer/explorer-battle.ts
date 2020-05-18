// Run this using `node build && node .sim-dist/explorer/explorer-battle`.

import {Battle} from '../battle';
import {Dex} from '../dex';
import {ExplorerRunner} from './explorer-runner';

let dragapultSet : PokemonSet = {
	species: 'dragapult',
	item: 'weaknesspolicy',
	ability: 'clearbody',
	moves: [ 'dragondarts', 'thunderbolt', 'dragondance', 'protect' ],
	evs: { hp: 4, spa: 252, spe: 252 },
	level: 50
};

let corviknightSet : PokemonSet = {
	species: 'corviknight',
	item: 'leftovers',
	ability: 'mirrorarmor',
	moves: [ 'bravebird', 'ironhead', 'roost', 'bulk up'],
	evs: { hp: 252, atk: 4, spd: 252 },
	level: 50
};

const p1spec = {
	name: "Bot 1",
	team: Dex.packTeam([dragapultSet]),
};
const p2spec = {
	name: "Bot 2",
	team: Dex.packTeam([corviknightSet]),
};

const spec = {
	formatid: "" as ID,
	format: {
		name: "[Gen 8] Exploration Game",
		mod: 'gen8',
		searchShow: false,
		maxForcedLevel: 50,
		teamLength: {
			validate: [1, 6],
			battle: 3,
		},
		// no restrictions, for serious (other than team preview)
		ruleset: ['Team Preview', 'Cancel Mod'],
		banlist: [] as string[],
		unbanlist: [] as string[]
	} as Format,
	p1: p1spec,
	p2: p2spec
};

let setupBattle = new Battle(spec);
// Choose from preview
setupBattle.choose('p1' as SideID, 'default');
setupBattle.choose('p2' as SideID, 'default');

let runner = new ExplorerRunner(setupBattle);
runner.run().then(() => {
	console.log('Run complete');
});