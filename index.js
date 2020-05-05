'use strict';

const express = require('express');
const Logger = require('./utils/Logger');
const app = express();
const dataApi = require('./routes/data-api.js');
const metaApi = require('./routes/data-meta-api.js');
const actionaApi = require('./routes/action-api.js');
const middleware = require('./routes/middleware');
const PORT = process.env.PORT ? process.env.PORT : 5001;
const CronJob = require('cron').CronJob;
const AirtableSync = require('./services/AirtableSync')

// Add in the middleware
middleware.set(app);

// API catch all and redirect to 404 page
app.route('*', function(req, res) {
    res.status(404).send({ error: 'Undefined command:' + req.originalUrl });
});

app.post('/data/geo/search', dataApi.geoSearch);
app.post('/data/search', dataApi.search);
app.post('/data/download', dataApi.dowmnload);
app.get('/meta', metaApi.getMeta);
app.get('/action/:actionId', actionaApi.load, actionaApi.get);

// Start App
middleware.setFinal(app);

// Listen for shut down so we can handle it gracefully
process.on('SIGTERM', function() {
    Logger.info('Closing');
    app.close();
});

var server = app.listen(PORT, function() {
    Logger.info(`Listening on port ${PORT}`);
});

setTimeout(async ()=>{

    if (process.env.DO_IMPORT == 'true'){
        const sync = new AirtableSync();
        await sync.setup();
    
        var job = new CronJob('0 * * * *', async ()=>{
            await sync.getDocs();
        }, null, true, 'America/New_York');
    
        job.start();    
    }

}, 500);



// Export server (handy for running tests against the API)
module.exports = app;

  
