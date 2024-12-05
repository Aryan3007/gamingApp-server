import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
// import mongoose from 'mongoose';
// import authrouter from './routes/authRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); 
app.use(bodyParser.json()); 

// const connectDB=async()=>{
//     try {
//         const connect = await mongoose.connect(process.env.MONGODB_URL)
//         console.log(`connected to mongodb ${connect.connection.host}`)
//     } catch (error) {
//         console.log(`error in mongodb ${error}`)
//     }
// }
// connectDB()

app.get('/', (req, res) => {
  res.send('Backend for React Native App');
});


// app.use('/api/v1/auth', authrouter)


// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
