import { Battle } from "../battle";
import { ExplorerBattleStream } from "./explorer-battle-stream";
import { ExplorerPath } from "./explorer-path";
import { Explorer } from "./explorer";
import { getPlayerStreams } from "../battle-stream";
import { ObjectReadStream } from "../../lib/streams";
import { consoleips } from "../../config/config-example";

export class ExplorerPathResult {
	constructor(
		public path : ExplorerPath,
		public log : string[]
	) {
	}
}

export class ExplorerRunner {
	private baseBattleJson : AnyObject;
	private decisionsToExplore : number;

	constructor(battle : Battle, decisionsToExplore : number = 1) {
		this.baseBattleJson = battle.toJSON();
		this.decisionsToExplore = decisionsToExplore;
	}

	async run() : Promise<void> {
		return new Promise<void>(async resolve => {
			let result = await this.runInternal(new ExplorerPath());
			console.log(result.path.toString());
			for (let chunk of result.log) {
				console.log(chunk);
			}
			resolve();
		});
	}

	private runInternal(seedPath : ExplorerPath) : Promise<ExplorerPathResult> {
		return new Promise<ExplorerPathResult>(async resolve => {
			let battleStream = new ExplorerBattleStream(Battle.fromJSON(this.baseBattleJson));
			let streams = getPlayerStreams(battleStream);
			let logReading = this.readFullStream(streams.spectator);
			let explorer = new Explorer(battleStream.battle as Battle, streams, seedPath, 0, this.decisionsToExplore - seedPath.decisions.length);
			explorer.continue();
			await explorer.waitForEnd();
			await battleStream.end();
			let result = new ExplorerPathResult(explorer.path, await logReading);
			resolve(result);
		});
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