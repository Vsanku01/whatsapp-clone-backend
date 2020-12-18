import express from 'express';
import mongoose from 'mongoose';
import Messages from './models/messageModel.js';
import Pusher from 'pusher';
require('dotenv').config();

// App config
const app = express();

const pusher = new Pusher({
  appId: '1119249',
  key: '46f4b9ddfb11782723fd',
  secret: 'd6788de66d548407bb2c',
  cluster: 'ap2',
  useTLS: true,
});

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

// DB config
mongoose.connect(
  process.env.MONGODB_URI,
  {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) {
      console.log(err);
    }
    console.log('Connected to database successfully');
  }
);

const db = mongoose.connection;

db.once('open', () => {
  console.log('DB Connected');

  const msgCollection = db.collection('messagemodels');
  const changeStream = msgCollection.watch();

  changeStream.on('change', (change) => {
    console.log(change);

    if (change.operationType === 'insert') {
      const messageDetails = change.fullDocument;
      pusher.trigger('messages', 'inserted', {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
      });
    } else {
      console.log('Error triggering Pusher');
    }
  });
});

// APi Routes
app.get('/', (req, res) => res.status(200).send('Hello world'));

app.post('/messages/new', (req, res) => {
  const dbMessage = req.body;

  // Create new message
  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(`new message created: \n ${data}`);
    }
  });
});

// Get messages

app.get('/messages/sync', (req, res) => {
  Messages.find({}, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

// Listen
app.listen(process.env.PORT || 5000, function () {
  console.log(
    'Express server listening on port %d in %s mode',
    this.address().port,
    app.settings.env
  );
});
