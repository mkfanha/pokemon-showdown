import { workerData, parentPort } from 'worker_threads';
import { IExplorerWorkData } from './explorer-work-data';
import { ExplorerRunner, ExplorerPathResult } from '../explorer-runner';

function onNewResult (result : ExplorerPathResult) {
	parentPort?.postMessage(result);
}

let data = <IExplorerWorkData>workerData;

let runner : ExplorerRunner = new ExplorerRunner(
	data.battleJson,
	data.decisionsToExplore,
	onNewResult);
	
runner.run();