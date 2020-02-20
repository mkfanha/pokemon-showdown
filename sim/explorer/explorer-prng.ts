import {PRNG, PRNGSeed} from '../prng';

export interface ExplorerPRNGRoll {
	toString() : string;
	getProbability() : number;
	nextPermutation(): ExplorerPRNGRoll | null;
}

export class ExplorerPRNGRollRange implements ExplorerPRNGRoll {

	constructor(
		public value : number,
		public min : number,
		public max : number) {
	}

	toString(): string {
		return this.value.toString();
	}

	getProbability() : number {
		return 1 / (this.max - this.min + 1);
	}

	nextPermutation(): ExplorerPRNGRoll | null {
		return (this.value < this.max) ?
			new ExplorerPRNGRollRange(this.value + 1, this.min, this.max) :
			null;
	}
}

export class ExplorerPRNGRollShuffle implements ExplorerPRNGRoll {
	constructor (
		public values : number[]
	) {
	}

	toString(): string {
		return `[${this.values.map(v => v.toString()).join(',')}]`;
	}
	getProbability(): number {
		return 1 / this.factorial(this.values.length + 1);
	}
	nextPermutation(): ExplorerPRNGRoll | null {
		let newValues = this.values.slice();
		let indexToPermute = this.values.length - 1;
		while (indexToPermute > 0) {
			++newValues[indexToPermute]
			if (newValues[indexToPermute] < (newValues.length - indexToPermute) + 1) {
				return new ExplorerPRNGRollShuffle(newValues);
			}
			// Carry
			newValues[indexToPermute] = 0;
			--indexToPermute;
		}
		// If we reach here, we overflowed which means we were on the last permutation
		return null;
	}

	factorial(x : number) : number {
		return x === 2 ? 2 : x * this.factorial(x-1);
	} 
}

export class ExplorerPRNGRollChance implements ExplorerPRNGRoll {

	constructor(
		public value : boolean,
		public numerator : number,
		public denominator : number
	) {
	}

	toString(): string {
		return this.value ? '1' : '0';
	}
	
	getProbability(): number {
		return this.value ?
		(this.numerator / this.denominator) :
		((this.denominator - this.numerator) / this.denominator);
	}
	nextPermutation(): ExplorerPRNGRoll | null {
		return this.value ?
			null :
			new ExplorerPRNGRollChance(true, this.numerator, this.denominator);
	}
}

export class ExplorerPRNG extends PRNG {
	currentIndex : number;
	values : ExplorerPRNGRoll[];
	allowNewRolls : boolean;

	constructor(values : ExplorerPRNGRoll[], startIndex: number = 0, allowNewRolls : boolean = true) {
		super();
		this.currentIndex = startIndex;
		this.values = values;
		this.allowNewRolls = allowNewRolls;
	}

	clone(): PRNG {
		return new ExplorerPRNG(this.values);
	}

	next(from?: number, to?: number): number {
		// This is only used for randomizing gender, not during battle
		if (from == undefined) {
			return 0;
		}

		let min = Math.floor(to == undefined ? 0 : from);
		let max = Math.floor(to == undefined ? from : to) - 1;

		// Trivial range, don't store a roll
		if (min == max) {
			return min;
		}

		++this.currentIndex;
		if (this.currentIndex < this.values.length) {
			let next = this.values[this.currentIndex] as ExplorerPRNGRollRange;
			if (!(next instanceof ExplorerPRNGRollRange) || next.min !== min || next.max !== max) {
				throw new Error('Value did not match expected next random value');
			} else {
				return next.value;
			}
		} else {
			if (!this.allowNewRolls) {
				throw new Error('Unknown roll requested, cannot generate new rolls');
			}
			let newRoll = new ExplorerPRNGRollRange(min, min, max);
			this.values.push(newRoll);
			return newRoll.value;
		}
	}

	/**
	 * Flip a coin (two-sided die), returning true or false.
	 *
	 * This function returns true with probability `P`, where `P = numerator
	 * / denominator`. This function returns false with probability `1 - P`.
	 *
	 * The numerator must be a non-negative integer (`>= 0`).
	 *
	 * The denominator must be a positive integer (`> 0`).
	 */
	randomChance(numerator: number, denominator: number): boolean {

		// Trivial cases, don't store a roll
		if (numerator == denominator) {
			return true;
		}
		if (numerator == 0) {
			return false;
		}

		++this.currentIndex;
		if (this.currentIndex < this.values.length) {
			let next = this.values[this.currentIndex] as ExplorerPRNGRollChance;
			if (!(next instanceof ExplorerPRNGRollChance) || next.numerator !== numerator || next.denominator !== denominator) {
				throw new Error('Value did not match expected next random value');
			} else {
				return next.value;
			}
		} else {
			if (!this.allowNewRolls) {
				throw new Error('Unknown roll requested, cannot generate new rolls');
			}
			let newRoll = new ExplorerPRNGRollChance(false, numerator, denominator);
			this.values.push(newRoll);
			return newRoll.value;
		}
	}

	/**
	 * This is how the game resolves speed ties.
	 *
	 * At least according to V4 in
	 * https://github.com/smogon/pokemon-showdown/issues/1157#issuecomment-214454873
	 */
	shuffle<T>(items: T[], start: number = 0, end: number = items.length) {
		let values : number[] = [];

		++this.currentIndex;
		if (this.currentIndex < this.values.length) {
			let next = this.values[this.currentIndex] as ExplorerPRNGRollShuffle;
			if (!(next instanceof ExplorerPRNGRollShuffle) || next.length !== (end - start)) {
				throw new Error('Value did not match expected next random value');
			} else {
				values = next.values;
			}
		} else {
			if (!this.allowNewRolls) {
				throw new Error('Unknown roll requested, cannot generate new rolls');
			}
			let newValues = new Array<number>(end - start - 1).fill(0);
			let newRoll = new ExplorerPRNGRollShuffle(newValues);
			this.values.push(newRoll);
			values = newRoll.values;
		}

		let i = 0;
		for (let i = 0; i < values.length; ++i) {
			const nextIndex = values[i];
			if (nextIndex !== 0) {
				[items[start+i], items[start+i+nextIndex]] = [items[start+i+nextIndex], items[start+i]];
			}
		}
	}
}