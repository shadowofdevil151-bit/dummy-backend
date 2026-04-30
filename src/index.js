import dotenv from "dotenv/config"
import connectDB from "./db/index.js";
import {app} from "./app.js";



connectDB().then(()=>{
    const port=process.env.PORT || 3000
    app.on("error",(error)=>{
        console.log(`App crashed!! Error: ${error}`);
    })
    app.listen(port,()=>{
        console.log(`Server listening on port: ${port}`);
    })    
}).catch((error)=>{
    console.log(`Database connection failed!! Error: ${error}`);
    process.exit(1)
})
