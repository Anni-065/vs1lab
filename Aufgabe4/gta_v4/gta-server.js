/**
 * Template für Übungsaufgabe VS1lab/Aufgabe3
 * Das Skript soll die Serverseite der gegebenen Client Komponenten im
 * Verzeichnisbaum implementieren. Dazu müssen die TODOs erledigt werden.
 */

/**
 * Definiere Modul Abhängigkeiten und erzeuge Express app.
 */

var http = require('http');
//var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var express = require('express');

var app;
app = express();
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

// Setze ejs als View Engine
app.set('view engine', 'ejs');

/**
 * Konfiguriere den Pfad für statische Dateien.
 * Teste das Ergebnis im Browser unter 'http://localhost:3000/'.
 */

app.use(express.static('public'));

/**
 * Konstruktor für GeoTag Objekte.
 * GeoTag Objekte sollen min. alle Felder des 'tag-form' Formulars aufnehmen.
 */

function GeoTag(latitude, longitude, name, hashtag, id) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.name = name;
    this.hashtag = hashtag;
    this.id = id;
}

/**
 * Modul für 'In-Memory'-Speicherung von GeoTags mit folgenden Komponenten:
 * - Array als Speicher für Geo Tags.
 * - Funktion zur Suche von Geo Tags in einem Radius um eine Koordinate.
 * - Funktion zur Suche von Geo Tags nach Suchbegriff.
 * - Funktion zum hinzufügen eines Geo Tags.
 * - Funktion zum Löschen eines Geo Tags.
 */

var geoTag = (function () {
    geoTagArray = [];

    var addTag = function(geoTag) {
        geoTagArray.push(geoTag);
        geoTag.id = geoTagArray.indexOf(geoTag);
    }

    var removeTag = function(geoTag) {
        let index = geoTagArray.indexOf(geoTag);
        while (index > -1) {
            geoTagArray.splice(index, 1);
            index = geoTagArray.indexOf(geoTag);
        }
        setIDs();
    }

    var removeTagByID = function(tagID) {
        geoTagArray.splice(tagID, 1);
        setIDs();
    }

    var setIDs = function() {
        geoTagArray.forEach(geoTag => {
            geoTag.id = geoTagArray.indexOf(geoTag);
        });
    }

    var searchTag = function(search) {
        return geoTagArray.filter(geoTag =>
            (geoTag.name.toLowerCase().includes(search.toLowerCase())
                || geoTag.hashtag.toLowerCase().includes(search.toLowerCase())));
    }

    var searchTagInDistance = function(lat, lon, r) {
        return geoTagArray.filter(geoTag => distancePoints(geoTag.latitude, geoTag.longitude, lat, lon, r));
    }

    const EARTH_RADIUS = 6371000; // Average radius in meter

    // Equirectangular approximation for easier function, returns true if distance <= radius.
    var distancePoints = function(lat1, lon1, lat2, lon2, radius) {
        const latRad1 = degToRad(lat1);
        const latRad2 = degToRad(lat2);
        const lonRad1 = degToRad(lon1);
        const lonRad2 = degToRad(lon2);

        const x = (lonRad2 - lonRad1) * Math.cos((latRad1 + latRad2) / 2);
        const y = (latRad2 - latRad1);
        const distance = Math.sqrt(x * x + y * y) * EARTH_RADIUS;

        return distance <= radius;
    }

    var degToRad = function(value) {
        return value * Math.PI/180;
    }

    return {
        geoTagArray: geoTagArray,
        addTag: addTag,
        removeTag: removeTag,
        removeTagByID: removeTagByID,
        searchTag: searchTag,
        searchTagInDistance: searchTagInDistance
    }
})();

var searchRadius = 5000; // 5 kilometers

/**
 * Route mit Pfad '/' für HTTP 'GET' Requests.
 * (http://expressjs.com/de/4x/api.html#app.get.method)
 *
 * Requests enthalten keine Parameter
 *
 * Als Response wird das ejs-Template ohne Geo Tag Objekte gerendert.
 */

app.get('/', function(req, res) {
    res.render('gta', {
        taglist: geoTag.geoTagArray,
        data: JSON.stringify(geoTag.geoTagArray),
        latitude: req.body.lat,
        longitude: req.body.lon
    });
});

/**
 * Route mit Pfad '/tagging' für HTTP 'POST' Requests.
 * (http://expressjs.com/de/4x/api.html#app.post.method)
 *
 * Requests enthalten im Body die Felder des 'tag-form' Formulars.
 * (http://expressjs.com/de/4x/api.html#req.body)
 *
 * Mit den Formulardaten wird ein neuer Geo Tag erstellt und gespeichert.
 *
 * Als Response wird das ejs-Template mit Geo Tag Objekten gerendert.
 * Die Objekte liegen in einem Standard Radius um die Koordinate (lat, lon).
 */

app.post('/tagging', function(req, res) {
    let tag = new GeoTag(req.body.lat, req.body.lon, req.body.tName, req.body.tHashtag);
    geoTag.addTag(tag);
    let currentTaglist = geoTag.searchTagInDistance(tag.latitude, tag.longitude, searchRadius); // search radius = 2000m
    res.render('gta', {
        taglist: currentTaglist,
        data: JSON.stringify(geoTag.geoTagArray),
        latitude: req.body.lat,
        longitude: req.body.lon
    });
});

/**
 * Route mit Pfad '/discovery' für HTTP 'POST' Requests.
 * (http://expressjs.com/de/4x/api.html#app.post.method)
 *
 * Requests enthalten im Body die Felder des 'filter-form' Formulars.
 * (http://expressjs.com/de/4x/api.html#req.body)
 *
 * Als Response wird das ejs-Template mit Geo Tag Objekten gerendert.
 * Die Objekte liegen in einem Standard Radius um die Koordinate (lat, lon).
 * Falls 'term' vorhanden ist, wird nach Suchwort gefiltert.
 */

app.post('/discovery', function(req, res) {
    let currentTaglist;
    if (req.body.dSearch) {
        currentTaglist = geoTag.searchTag(req.body.dSearch);
    } else {
        currentTaglist = geoTag.searchTagInDistance(req.body.lat, req.body.lon, searchRadius); // search radius = 2000m
    }
    res.render('gta', {
        taglist: currentTaglist,
        data: JSON.stringify(geoTag.geoTagArray),
        latitude: req.body.lat,
        longitude: req.body.lon
    })
});

app.get('/geotags', function (req, res) {
    if (req.query.search !== undefined) {
        res.json(geoTag.searchTag(req.query.search));
    } else if (req.query.latitude !== undefined && req.query.longitude !== undefined) {
        res.json(geoTag.searchTagInDistance(req.query.latitude, req.query.longitude, searchRadius));
    } else {
        res.json(geoTag.geoTagArray);
    }
});

app.post('/geotags', function (req, res) {
    if (req.body.name === undefined
        || req.body.latitude === undefined
        || req.body.longitude === undefined) {
        res.status(400).send("Tag isn't defined properly");
    } else {
        let newTag = new GeoTag(req.body.latitude, req.body.longitude, req.body.name, req.body.hashtag);
        geoTag.addTag(newTag);
        res.status(201).setHeader("Location", "/geotags/" + newTag.id);
        res.json(geoTag.searchTagInDistance(newTag.latitude, newTag.longitude, searchRadius));
    }
});

app.get('/geotags/:id', function (req, res) {
    if (typeof geoTag.geoTagArray[parseInt(req.params.id)]) {
        res.status(200).json(geoTag.geoTagArray[parseInt(req.params.id)]);
    } else {
        res.status(404).send("Tag doesn't exist");
    }
});

app.put('/geotags/:id', function (req, res) {
    if (typeof geoTag.geoTagArray[parseInt(req.params.id)] !== undefined) {
        if (req.body.name !== undefined
        || req.body.latitude !== undefined
        || req.body.longitude !== undefined) {
            let currentTag = geoTag.geoTagArray[parseInt(req.params.id)];
            currentTag.latitude = req.body.latitude;
            currentTag.longitude = req.body.longitude;
            currentTag.name = req.body.name;
            currentTag.hashtag = req.body.hashtag;
            res.status(200).json(currentTag);
        } else {
            res.status(400).send("Tag isn't defined properly");
        }
    } else {
        res.status(404).send("Tag doesn't exist");
    }
});

app.delete('/geotags/:id', function (req, res) {
    geoTag.removeTagByID(parseInt(req.params.id));
    res.status(200).send("Tag " + req.params.id + " deleted");
});

/**
 * Setze Port und speichere in Express.
 */

var port = 3000;
app.set('port', port);

/**
 * Erstelle HTTP Server
 */

var server = http.createServer(app);

/**
 * Horche auf dem Port an allen Netzwerk-Interfaces
 */

server.listen(port);
