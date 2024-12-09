import express, { Request, Response } from 'express';
import Helmet from 'helmet';
import swaggerUI from 'swagger-ui-express';

import swaggerDocument from './static/swagger.json' with { type: 'json' };

import { DidController } from './controllers/did.js';
import { CheqdController } from './controllers/cheqd.js';
import { ResourceController } from './controllers/resource.js';
import { CheqdRegistrar } from './service/cheqd.js';
import { MethodSpecificIdAlgo, VerificationMethods } from '@cheqd/sdk';

class App {
	public express: express.Application;

	constructor() {
		this.express = express();
		this.middleware();
		this.routes();
		CheqdRegistrar.instance;
	}

	private middleware() {
		this.express.use(express.json({ limit: '50mb' }));
		this.express.use(express.urlencoded({ extended: false }));
		this.express.use(Helmet());
		this.express.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));
	}

	private routes() {
		const app = this.express;
		const URL_PREFIX = '/1.0';
		const staticTraits = {
			cheqd: {
				updatable: true,
				deactivatable: true,
				enumerable: true,
				historyAvailable: true,
				humanReadable: false,
			},
		};
		const properties = {
			cheqd: {
				supportedVerificationMethods: [
					VerificationMethods.Ed255192020,
					VerificationMethods.Ed255192018,
					VerificationMethods.JWK,
				],
				supportedAlgorithm: [MethodSpecificIdAlgo.Base58, MethodSpecificIdAlgo.Uuid],
				localStoreTTL: process.env.LOCAL_STORE_TTL,
			},
		};
		const didMethods = ['cheqd'];

		app.get('/', (req, res) => res.redirect('api-docs'));

		// did-registrar
		app.post(
			`${URL_PREFIX}/create`,
			DidController.createValidator,
			DidController.commonValidator,
			new DidController().create
		);
		app.post(
			`${URL_PREFIX}/update`,
			DidController.updateValidator,
			DidController.commonValidator,
			new DidController().update
		);
		app.post(
			`${URL_PREFIX}/deactivate`,
			DidController.deactivateValidator,
			DidController.commonValidator,
			new DidController().deactivate
		);
		app.post(
			`${URL_PREFIX}/:did/create-resource`,
			ResourceController.createValidator,
			DidController.commonValidator,
			new ResourceController().create
		);

		app.post(
			`${URL_PREFIX}/createResource`,
			ResourceController.createResourceValidator,
			DidController.commonValidator,
			new ResourceController().createResource
		);
		app.post(
			`${URL_PREFIX}/updateResource`,
			ResourceController.createResourceValidator,
			DidController.commonValidator,
			new ResourceController().create
		);

		app.get(`${URL_PREFIX}/methods`, (req: Request, res: Response) => {
			res.status(200).json(didMethods);
		});
		app.get(`${URL_PREFIX}/properties`, (req: Request, res: Response) => {
			res.status(200).json(properties);
		});
		app.get(`${URL_PREFIX}/traits`, (req: Request, res: Response) => {
			res.status(200).json(staticTraits);
		});

		// cheqd-helpers
		app.get(`${URL_PREFIX}/key-pair`, new CheqdController().generateKeys);
		app.get(`${URL_PREFIX}/did-document`, CheqdController.didDocValidator, new CheqdController().generateDidDoc);

		// 404 for all other requests
		app.all('*', (req, res) => res.status(400).send('Bad request'));
	}
}

export default new App().express;
