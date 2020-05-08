/**
 * Example random player AI.
 *
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * @license MIT
 */

import {ObjectReadWriteStream} from '../../lib/streams';
import {BattlePlayer} from '../battle-stream';
import {ExplorerPath, ExplorerChoiceData, ExplorerDecision} from './explorer-path';
import { ExplorerPRNG } from './explorer-prng';


export class ExplorerPlayerAI extends BattlePlayer {
	explorer : Explorer;
	playerIndex : number;

	constructor(
		playerStream: ObjectReadWriteStream<string>,
		explorer : Explorer,
		playerIndex : number,
		debug: boolean = false
	) {
		super(playerStream, debug);
		this.explorer = explorer;
		this.playerIndex = playerIndex;
	}

	receiveError(error: Error) {
		// TODO: Register that the path is bad
		if (error.message.startsWith('[Unavailable choice]')) return;
		throw error;
	}

	receiveRequest(request: AnyObject) {
		this.explorer.onRequestReceived(this.playerIndex, request);
	}
}

interface ExplorerCompletionCallback { (value? : boolean): void }

export class Explorer {
	battle : Battle;
	ai : ExplorerPlayerAI[];
	originalPathLength : number;
	currentDecision : number;
	decisionsToGenerate : number;
	started : boolean = false;
	done : boolean = false;

	private _path : ExplorerPath;
	get path() : ExplorerPath {
		return this._path;
	}
	set path(value : ExplorerPath) {
		this._path = value;
	}

	private completionCallbacks: ExplorerCompletionCallback[] = [];

	constructor(
		battle : Battle,
		streams : any,
		path: ExplorerPath,
		currentDecision : number = 0,
		decisionsToGenerate : number = 0) {
			this.battle = battle;
			this.path = new ExplorerPath(path);
			this.originalPathLength = this.path.decisions.length;
			this.currentDecision = currentDecision;
			this.decisionsToGenerate = decisionsToGenerate;
			this.ai = new Array<ExplorerPlayerAI>(this.battle.sides.length);
			let playerStreams = [streams.p1, streams.p2, streams.p3, streams.p4];
			for (let i = 0; i < this.ai.length; ++i) {
				this.ai[i] = new ExplorerPlayerAI(
					playerStreams[i],
					this,
					i,
					false);
				this.ai[i].start();
		}
	}

	continue() {
		let requests = this.battle.getRequests(this.battle.requestState, this.battle.getMaxTeamSize());
		for (let i = 0; i < requests.length; ++i) {
			if (requests[i]) {
				this.onRequestReceived(i, requests[i]);
			}
		}
	}

	waitForEnd() : Promise<boolean> {
		return new Promise(resolve => {
			this.completionCallbacks.push(resolve);
		})
	}

	onRequestReceived(playerIndex : number, request: any) {
		this.started = true;
		let choices : ExplorerChoiceData[] = [];

		if (this.done) {
			return;
		}

		if (request.wait) {
			return;
		} 
		
		if (request.teamPreview) {
			// TODO: Handle this through the decision tree to handle randomness on first switch-in?
			this.ai[playerIndex].choose('default');
			return;
		} else if (this.currentDecision < this.originalPathLength) {
			choices = this.path.decisions[this.currentDecision].choices[playerIndex];
			// TODO: Verify choices match
		} else if (this.currentDecision < this.originalPathLength + this.decisionsToGenerate) {
			let decision : ExplorerDecision;
			if (this.currentDecision < this.path.decisions.length) {
				decision = this.path.decisions[this.currentDecision];
			} else {
				decision = new ExplorerDecision();
				this.path.decisions.push(decision);
			}

			// Only allow moves
			if (request.active) {
				choices = request.active.map((slot : any) => {
					let moves = new Array<string>(slot.moves.length);
					for (let i = 0; i < moves.length; ++i) {
						moves[i] = `move ${(i + 1).toString()}`;
					}
					let newChoice = new ExplorerChoiceData();
					newChoice.choices = moves;
					newChoice.choiceIndex = 0;
					return newChoice;
				});
				decision.choices[playerIndex] = choices;
			} else {
				console.log('Received unrecognized request');
				console.log(JSON.stringify(request));
			}
		} else {
			this.done = true;
			this.onCompleted(false);
			// TODO: Fire a callback?
			return;
		}

		if (choices.length > 0) {
			let choicesComplete : boolean = this.battle.sides.every((value, index) => {
				return index == playerIndex || value.isChoiceDone();
			});

			if (choicesComplete) {
				this.battle.prng = new ExplorerPRNG(this.path.decisions[this.currentDecision].rolls);
			}

			let commands = choices.map(choice => choice.choices[choice.choiceIndex]);
			this.ai[playerIndex].choose(commands.join(', '));

			if (choicesComplete) {
				++this.currentDecision;
			}

			if (this.battle.ended) {
				this.onCompleted(true);
			}
		}
	}

	private onCompleted(ended : boolean) {
		for (let i = 0; i < this.completionCallbacks.length; ++i) {
			this.completionCallbacks[i](ended);
		}
		this.completionCallbacks = [];
	}
}