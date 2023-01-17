import mongoose from 'mongoose'
import * as dotenv from "dotenv";


export class Mongo {

    public static instance = new Mongo()

    private db: mongoose.Connection | undefined = undefined

    constructor() {
        if(!(process.env.DB_CONN_URI || process.env.DB_USER || process.env.DB_PASS)) {
            console.log("Invalid credentials MongoDB")
            process.exit(1)
        }
    }

    public async connect() {
        dotenv.config()

        if(this.db) {
            return
        }

        mongoose.connect(process.env.DB_CONN_URI!, {
            user: process.env.DB_USER,
            pass: process.env.DB_PASS,
        })
        .then(()=>{
            console.log("Database connected")
        })
        .catch((err)=>{
            console.log("MongoDB conneciton error. Please make sure mongoDB is running. \n")
            process.exit(1)
        })
        this.db = mongoose.connection

        this.db.on("error", (err)=>console.log("MongoDB error: " + err))
    }
}
