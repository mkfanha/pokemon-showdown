import { ExplorerPathResult } from '../explorer-runner'
import { Worker } from 'worker_threads';
import { IExplorerWorkData } from './explorer-work-data';

export interface IExplorerWorkUnit {
	id : string;
	results : ExplorerPathResult[];
	finished : boolean;
}

interface IExplorerWorkUnitInternal extends IExplorerWorkUnit {
	worker : Worker;
}

function toExternal(wu : IExplorerWorkUnitInternal) : IExplorerWorkUnit {
	return {
		id: wu.id,
		results: wu.results,
		finished: wu.finished
	};
}

export class ExplorerWorkPool {
	private workUnits : Map<string, IExplorerWorkUnitInternal>;
	private nextWorkUnitId : number;

	constructor() {
		this.workUnits = new Map<string, IExplorerWorkUnitInternal>();
		this.nextWorkUnitId = 0;
	}

	public startNew(battleJson : AnyObject, decisionsToExplore : number = 1) : IExplorerWorkUnit {
		let newWorkUnitId = (this.nextWorkUnitId++).toString();

		let newWorker = new Worker(
			'./.sim-dist/explorer/worker/explorer-worker.js',
			{
				workerData : <IExplorerWorkData>{
					battleJson : battleJson,
					decisionsToExplore : decisionsToExplore
				}
			});
		let newWorkUnit : IExplorerWorkUnitInternal = {
			id : newWorkUnitId,
			worker : newWorker,
			results : [],
			finished : false
		};

		this.workUnits.set(newWorkUnitId, newWorkUnit);
		newWorker.on('message', (result) => { newWorkUnit.results.push(result) });
		newWorker.on('exit', (exitCode) => newWorkUnit.finished = true);

		return toExternal(newWorkUnit);
	}

	public getWorkById(id : string) : IExplorerWorkUnit | undefined {
		return this.workUnits.get(id);
	}

	public getAllItems(): IExplorerWorkUnit[] {
		return Array.from(this.workUnits.values());
	}
}