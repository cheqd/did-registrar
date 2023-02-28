import express from 'express'
import Helmet from 'helmet'
import * as swagger from 'swagger-ui-express'
import * as swaggerJson from '../swagger.json'

import { DidController } from './controllers/did'
import { CheqdController } from './controllers/cheqd'
import { ResourceController } from './controllers/resource'
import { CheqdRegistrar } from './service/cheqd'

class App {
  public express: express.Application

  constructor() {
    this.express = express()
    this.middleware()
    this.routes()
    CheqdRegistrar.instance
  }

  private middleware() {
    this.express.use(express.json({ limit: '50mb' }))
		this.express.use(express.urlencoded({ extended: false }))
    this.express.use(Helmet())
    this.express.use('/api-docs', swagger.serve, swagger.setup(swaggerJson))
  }

  private routes() {
    const app = this.express
    const URL_PREFIX = '/1.0'
    
    app.get('/', (req, res) => res.redirect('api-docs'))

    // did-registrar
    app.post(`${URL_PREFIX}/create`, DidController.createValidator, DidController.commonValidator, new DidController().create)
    app.post(`${URL_PREFIX}/update`, DidController.updateValidator, DidController.commonValidator, new DidController().update)
    app.post(`${URL_PREFIX}/deactivate`, DidController.deactivateValidator, DidController.commonValidator, new DidController().deactivate)
    app.post(`${URL_PREFIX}/:did/create-resource`, ResourceController.createValidator, DidController.commonValidator, new ResourceController().create)

    // cheqd-helpers
    app.get(`${URL_PREFIX}/key-pair`, new CheqdController().generateKeys)
    app.get(`${URL_PREFIX}/did-document`, CheqdController.didDocValidator, new CheqdController().generateDidDoc)

    // 404 for all other requests
    app.all('*', (req, res) => res.status(400).send('Bad request'))
  }
  
}

export default new App().express