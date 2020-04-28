import { Battle } from "../battle";
import { ExplorerBattleStream } from "./explorer-battle-stream";
import { ExplorerPath, ExplorerDecision } from "./explorer-path";
import { Explorer } from "./explorer";
import { getPlayerStreams, BattleTextStream } from "../battle-stream";
import { ObjectReadStream } from "../../lib/streams";
import { consoleips } from "../../config/config-example";

export class ExplorerPathResult {
	constructor(
		public battleJson : AnyObject,
		public path : ExplorerPath,
		public log : string[]
	) {
	}
}

export class ExplorerRunner {
	private baseBattleJson : AnyObject;
	private decisionsToExplore : number;
	public results : ExplorerPathResult[];

	constructor(battle : Battle, decisionsToExplore : number = 1) {
		this.baseBattleJson = battle.toJSON();
		this.decisionsToExplore = decisionsToExplore;
		this.results = [];
	}

	public async run() : Promise<void> {
		let result : ExplorerPathResult | null = await this.runInternal(new ExplorerPath());
		/*console.log(result.path.toString());
		for (let chunk of result.log) {
			console.log(chunk);
		}*/
		while (result != null) {
			console.log(result.path.toString());
			//this.results.push(result);
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
		let logReading = this.readFullStream(streams.spectator);
		let explorer = new Explorer(battleStream.battle as Battle, streams, seedPath, 0, this.decisionsToExplore - seedPath.decisions.length);
		explorer.continue();
		await explorer.waitForEnd();

		if (!battleStream.battle) {
			throw new Error('Battle was null');
		}
		let battleJson = battleStream.battle.toJSON();

		await battleStream.end();

		let result = new ExplorerPathResult(
			battleJson,
			explorer.path,
			await logReading);
		return result;
	}

	private readFullStream(stream : ObjectReadStream<unknown>) : Promise<string[]> {
		return new Promise<string[]>(async resolve => {
			let result : string[] = [];
			let chunk;
			// tslint:disable-next-line no-conditional-assignment
			while ((chunk = await stream.read())) {
				result.push(chunk as string);
			}
			resolve(result);
		});
	}
}