import { ExplorerPRNGRoll } from './explorer-prng';

export class ExplorerChoiceData {
	choiceIndex : number;
	choices : string[];

	constructor(original? : ExplorerChoiceData) {
		if (original) {
			this.choiceIndex = original.choiceIndex;
			this.choices = original.choices.slice();
		} else {
			this.choiceIndex = 0;
			this.choices = [];
		}
	}

	toString() : string {
		return this.choiceIndex.toString();
	}
}

export class ExplorerDecision {
	rolls : ExplorerPRNGRoll[];
	choices : ExplorerChoiceData[][];

	constructor(original? : ExplorerDecision) {
		if (original) {
			this.rolls = original.rolls.slice();
			this.choices = [];
			let playerChoices : any;
			for (playerChoices in original.choices ) {
				let copiedSet : ExplorerChoiceData[] = [];
				
				let choice : any;
				for (choice in playerChoices) {
					copiedSet.push(new ExplorerChoiceData(choice));
				}
				this.choices.push(copiedSet);
			}
		} else {
			this.rolls = [];
			this.choices = [];
		}
	}

	toString() : string {
		const choicesList = `${this.choices.map(playerChoices => `[${playerChoices.map(choice => choice.toString()).join(',')}]`).join(';')}`;
		const rngList = this.rolls.map(r => r.toString()).join(',');
		return `(${choicesList})<${rngList}>`;
	}
}

export class ExplorerPath {
	decisions : ExplorerDecision[];

	constructor (original? : ExplorerPath) {
		if (original) {
			this.decisions = [];
			let round : any;
			for (round in original.decisions) {
				this.decisions.push(new ExplorerDecision(round));
			}
		} else {
			this.decisions = []
		}
	}

	toString() : string {
		return this.decisions.map(decision => decision.toString()).join('|');
	}
}
