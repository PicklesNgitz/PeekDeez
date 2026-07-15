import express from 'express';
import helper from './helper';

const app = express();
app.use('/api', helper);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Helper app running on http://localhost:${PORT}`);
});