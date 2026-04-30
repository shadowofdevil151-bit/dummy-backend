import { DB_NAME } from "../constants.js";
import mongoose from "mongoose";

async function connectDB() {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.DATABASE_URI}/${DB_NAME}`)
        console.log(`Database connected!  DB HOST: ${connectionInstance.connection.host} `);
    } catch (error) {
        console.error(`Database connection failed!! Error: ${error}`)
        process.exit(1)
    }
}

export default connectDB