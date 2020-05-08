import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import { Battle } from '../../battle';
import { Dex } from '../../dex';
import { ExplorerWorkPool, IExplorerWorkUnit } from '../worker/explorer-work-pool';
import { URL } from 'url';

let dragapultSet : PokemonSet = {
	species: 'dragapult',
	item: 'weaknesspolicy',
	ability: 'clearbody',
	moves: [ 'dragondarts', 'thunderbolt', 'dragondance', 'protect' ],
	evs: { hp: 4, spa: 252, spe: 252 },
	level: 50
};

let corviknightSet : PokemonSet = {
	species: 'corviknight',
	item: 'leftovers',
	ability: 'mirrorarmor',
	moves: [ 'bravebird', 'ironhead', 'roost', 'bulk up'],
	evs: { hp: 252, atk: 4, spd: 252 },
	level: 50
};

const p1spec = {
	name: "Bot 1",
	team: Dex.packTeam([dragapultSet]),
};
const p2spec = {
	name: "Bot 2",
	team: Dex.packTeam([corviknightSet]),
};

const spec = {
	formatid: "" as ID,
	format: {
		name: "[Gen 8] Exploration Game",
		mod: 'gen8',
		searchShow: false,
		maxForcedLevel: 50,
		teamLength: {
			validate: [1, 6],
			battle: 3,
		},
		// no restrictions, for serious (other than team preview)
		ruleset: ['Team Preview', 'Cancel Mod'],
		banlist: [] as string[],
		unbanlist: [] as string[]
	} as Format,
	p1: p1spec,
	p2: p2spec
};

let setupBattle = new Battle(spec);
// Choose from preview
setupBattle.choose('p1' as SideID, 'default');
setupBattle.choose('p2' as SideID, 'default');

let battleJson : AnyObject = setupBattle.toJSON();

// Server logic

let hostPrefix = 'http://localhost:8080';
const basePath = 'explorer';
const startCommand = 'start';
const statusCommand = 'status';
const resultsCommand = 'results';
const skipQueryParam = 'skip';
const countQueryParam = 'count';
const defaultResultCount = 10;

function respond404(response : ServerResponse) {
	response.statusCode = 404;
	response.end();
}

function respondObject(response : ServerResponse, obj : any) {
	response.end(JSON.stringify(obj));
}

function toWorkSummary(wu : IExplorerWorkUnit) : any {
	return {
		id : wu.id,
		resultCount : wu.results.length,
		finished : wu.finished,
		statusLink : `${hostPrefix}/${basePath}/${statusCommand}/${wu.id}`,
		resultsLink : `${hostPrefix}/${basePath}/${resultsCommand}/${wu.id}`
	};
}

function toResults(wu : IExplorerWorkUnit, skip : number, count : number) {
	return {
		results : wu.results.slice(skip, skip + count),
		finished : wu.finished,
		statusLink : `${hostPrefix}/${basePath}/${statusCommand}/${wu.id}`,
		selfLink : `${hostPrefix}/${basePath}/${resultsCommand}/${wu.id}?${skipQueryParam}=${skip}&${countQueryParam}=${count}`,
		prevLink : skip < count ? null : `${hostPrefix}/${basePath}/${resultsCommand}/${wu.id}?${skipQueryParam}=${skip-count}&${countQueryParam}=${count}`,
		nextLink : skip + count >= wu.results.length ? null : `${hostPrefix}/${basePath}/${resultsCommand}/${wu.id}?${skipQueryParam}=${skip+count}&${countQueryParam}=${count}`
	};
}

let explorerWorkPool = new ExplorerWorkPool();

let http : Server = createServer((request: IncomingMessage, response: ServerResponse) => {
	if (!request.url) {
		return;
	}

	console.log(`Incoming request at ${request.url}`);

	hostPrefix = `http://${request.headers.host}`;
	let url = new URL(request.url, hostPrefix);
	let requestParts = url.pathname.substring(1).split('/');

	if (requestParts.length < 2) {
		respond404(response);
		return;
	}

	if (requestParts[0] !== basePath) {
		respond404(response);
		return;
	}

	switch (requestParts[1]) {
		case startCommand: {
			let newWorkUnit = explorerWorkPool.startNew(battleJson);
			respondObject(response, toWorkSummary(newWorkUnit));
		}
		return;

		case statusCommand: {
			let workUnit : IExplorerWorkUnit | undefined;
			if (requestParts.length < 3 || !(workUnit = explorerWorkPool.getWorkById(requestParts[2]))) {
				respond404(response);
			}
			else {
				respondObject(response, toWorkSummary(workUnit));
			}
		}
		return;

		case resultsCommand: {
			let workUnit : IExplorerWorkUnit | undefined;
			if (requestParts.length < 3 || !(workUnit = explorerWorkPool.getWorkById(requestParts[2]))) {
				respond404(response);
			}
			else {
				let skip = Number.parseInt(url.searchParams.get(skipQueryParam) || '');
				let count = Number.parseInt(url.searchParams.get(countQueryParam) || '');
				respondObject(response, toResults(
					workUnit,
					isNaN(skip) ? 0 : skip,
					isNaN(count) ? defaultResultCount : count));
			}
		}

		default:
			respond404(response);
			return;
	}
}).listen(8080);