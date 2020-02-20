import {BattleStream} from '../battle-stream';
import {Battle} from '../battle';

export class ExplorerBattleStream extends BattleStream {
	constructor(
		battle : Battle,
		options: {debug?: boolean, keepAlive?: boolean, replay?: boolean} = {}) {
		super(options);
		this.attachBattle(battle);
	}

	attachBattle(battle : Battle) {
		if (this.battle) {
			throw new Error('Create a new stream to attach a different battle');
		}

		this.battle = battle;
		battle.restart((t: string, data: any) => {
			if (Array.isArray(data)) data = data.join("\n");
			this.pushMessage(t, data);
			if (t === 'end' && !this.keepAlive) this.push(null);
		});
	}
}