import express from 'express'
import Helmet from 'helmet'
import { DidController } from './controllers/did'
import { CheqdRegistrar } from './service/cheqd'
import * as swagger from 'swagger-ui-express'
import * as swaggerJson from '../swagger.json'
class App {
    public express: express.Application

    constructor() {
        this.express = express()
        this.middleware()
        this.routes()
        CheqdRegistrar.instance
    }

    private middleware() {
        this.express.use(Helmet())
		this.express.use(express.urlencoded({ extended: false }))
        this.express.use('/api-docs', swagger.serve, swagger.setup(swaggerJson))
    }

    private routes() {
        const app = this.express
        const URL_PREFIX = '/1.0'

        // routes 
        app.post(`${URL_PREFIX}/create`, new DidController().create)
        app.post(`${URL_PREFIX}/update`, new DidController().update)
        app.post(`${URL_PREFIX}/deactivate`, (req,res)=>res.send('To be implemented'))
        // 404 for all other requests
        app.all('*', (req, res) => res.status(400).send('Bad request'))
    }
    
}

export default new App().express