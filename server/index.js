const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.get('/api/message', (_req, res) => {
  res.json({ message: 'Hello from Node.js service!' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
