import { Battle } from "../battle";
import { ExplorerBattleStream } from "./explorer-battle-stream";
import { ExplorerPath } from "./explorer-path";
import { Explorer } from "./explorer";
import { getPlayerStreams } from "../battle-stream";

export class ExplorerPathResult {
	constructor(
		public battleJson : AnyObject,
		public path : ExplorerPath
	) {
	}
}

export class ExplorerRunner {
	private baseBattleJson : AnyObject;
	private decisionsToExplore : number;
	private onNewResult? : (result: ExplorerPathResult) => void;
	public results : ExplorerPathResult[];

	constructor(battle : Battle | AnyObject,
				decisionsToExplore : number = 1,
				onNewResult? : (result : ExplorerPathResult) => void) {
		this.baseBattleJson = battle instanceof Battle ? battle.toJSON() : battle;
		this.decisionsToExplore = decisionsToExplore;
		this.results = [];
		this.onNewResult = onNewResult;
	}

	public async run() : Promise<void> {
		let result : ExplorerPathResult | null = await this.runInternal(new ExplorerPath());

		while (result != null) {
			// console.log(result.path.toString());
			this.results.push(result);
			let lastPath : ExplorerPath = result.path;
			result = await this.runNextPermutation(lastPath);
		}
	}

	private async runNextPermutation(path : ExplorerPath) : Promise<ExplorerPathResult | null> {
		let nextPath = path.nextPermutation();
		return nextPath != null ? await this.runInternal(nextPath) : null;
	}

	private async runInternal(seedPath : ExplorerPath) : Promise<ExplorerPathResult> {
		let battleStream = new ExplorerBattleStream(Battle.fromJSON(this.baseBattleJson));
		let streams = getPlayerStreams(battleStream);
		let explorer = new Explorer(battleStream.battle as Battle, streams, seedPath, 0, this.decisionsToExplore - seedPath.decisions.length);
		explorer.continue();
		await explorer.waitForEnd();

		if (!battleStream.battle) {
			throw new Error('Battle was null');
		}
		let battleJson = battleStream.battle.toJSON();

		await battleStream.end();

		let result = new ExplorerPathResult(battleJson, explorer.path);
		this.onNewResult?.call(null, result);
		return result;
	}
}