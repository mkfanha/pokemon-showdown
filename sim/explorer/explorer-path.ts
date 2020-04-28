import { ExplorerPRNGRoll, ExplorerPRNGRollRange } from './explorer-prng';

export class ExplorerChoiceData {
	choiceIndex : number;
	choices : string[];

	constructor(original? : ExplorerChoiceData, choiceIndex? : number | null) {
		if (original) {
			this.choices = original.choices.slice();
			this.choiceIndex = choiceIndex != null ? choiceIndex : original.choiceIndex;
		} else {
			this.choiceIndex = 0;
			this.choices = [];
		}
	}

	nextPermutation(): ExplorerChoiceData | null {
		return (this.choiceIndex < this.choices.length - 1) ?
			new ExplorerChoiceData(this, this.choiceIndex + 1) :
			null;
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
			for (let p = 0; p < original.choices.length; ++p) {
				let copiedSet : ExplorerChoiceData[] = [];
				for (let c = 0; c < original.choices[p].length; ++c) {
					copiedSet.push(new ExplorerChoiceData(original.choices[p][c]));
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
			for (let i = 0; i < original.decisions.length; ++i) {
				this.decisions.push(new ExplorerDecision(original.decisions[i]));
			}
		} else {
			this.decisions = []
		}
	}

	public nextPermutation(): ExplorerPath | null {
		let nextPath : ExplorerPath | null = null;

		// Start with the last decision and work backwards
		for (let d = this.decisions.length - 1; d >= 0; --d) {
			let decision : ExplorerDecision = this.decisions[d];

			// Start with the last RNG roll and work backwards
			for (let r = decision.rolls.length - 1; r >= 0; --r) {
				let nextRoll = decision.rolls[r].nextPermutation();
				if (nextRoll != null) {
					// Assume a 0-15 roll is a damage roll and skip values besides 0, 7, and 15
					if ((nextRoll instanceof ExplorerPRNGRollRange) && nextRoll.min == 0 && nextRoll.max == 15) {
						if (nextRoll.value < 7) {
							nextRoll.value = 7;
						}
						else {
							nextRoll.value = 15;
						}
					}

					nextPath = new ExplorerPath(this);

					// Slice out all decisions after this
					nextPath.decisions = nextPath.decisions.slice(0, d + 1);

					// Slice out all rolls after this
					nextPath.decisions[d].rolls = nextPath.decisions[d].rolls.slice(0, r + 1);

					// Register the new roll in-place
					nextPath.decisions[d].rolls[r] = nextRoll;

					break;
				}
			}

			// If we already permutated on the RNG, fall out
			if (nextPath != null) {
				break;
			}

			// Start with the last choice by the last player and work back
			for (let p = decision.choices.length - 1; p >= 0; --p) {
				for (let c = decision.choices[p].length - 1; c >= 0; --c) {
					let nextChoice = decision.choices[p][c].nextPermutation();
					if (nextChoice != null) {
						nextPath = new ExplorerPath(this);

						// Slice out all decisions after this
						nextPath.decisions = nextPath.decisions.slice(0, d + 1);

						// Remove all rolls
						nextPath.decisions[d].rolls = [];

						// Register the next choice
						nextPath.decisions[d].choices[p][c] = nextChoice;

						// Reset all choices after this in the same slot
						// TODO: Handle switching choices affecting choices after that
						for (c = c + 1;c < nextPath.decisions[d].choices[p].length; ++c) {
							nextPath.decisions[d].choices[p][c].choiceIndex = 0;
						}

						// Reset choices for all players after
						// TODO: Handle switching choices affecting choices after that
						for (p = p + 1;p < nextPath.decisions[d].choices.length; ++p) {
							for (c = 0; c < nextPath.decisions[d].choices[p].length; ++c)
							nextPath.decisions[d].choices[p][c].choiceIndex = 0;
						}

						break;
					}
				}

				// If we already permutated on a choice, fall out
				if (nextPath != null) {
					break;
				}
			}

			// If we already permutated on a choice, fall out
			if (nextPath != null) {
				break;
			}
		}

		console.log(nextPath?.toString());
		return nextPath;
	}

	toString() : string {
		return this.decisions.map(decision => decision.toString()).join('|');
	}
}
